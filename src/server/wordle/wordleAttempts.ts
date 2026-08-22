import "server-only";

import type { WordleAttemptSnapshot } from "@/contracts/wordle";
import {
  decodeStoredWordlePuzzle,
  getWordlePuzzleForEvent,
  type StoredWordlePuzzle,
  type StoredWordlePuzzleRow,
} from "@/content/wordle/getWordlePuzzle";
import {
  getWordleGameStatus,
  normalizeWordleGuess,
  submitWordleGuess as submitDomainWordleGuess,
  WORDLE_MAX_ATTEMPTS,
} from "@/domain/wordle/gameplay";
import type { WordleGameState, WordlePuzzle } from "@/domain/wordle/types";
import type { CurrentPlayer } from "@/server/players/getCurrentPlayer";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import { isAcceptedWordleGuess } from "@/server/wordle/acceptedGuesses";
import type { Tables } from "@/types/database.generated";

const ATTEMPT_COLUMNS =
  "id, event_id, player_id, puzzle_id, submitted_guesses, version, created_at, updated_at, completed_at";
const ATTEMPT_WITH_PUZZLE_COLUMNS =
  "id, event_id, player_id, puzzle_id, submitted_guesses, version, created_at, updated_at, completed_at, puzzle:wordle_puzzles!wordle_attempts_puzzle_fkey(id, event_id, public_id, answer)";
const ACTIVE_ATTEMPT_INDEX = "wordle_attempts_one_active_per_player_puzzle_idx";
const STORED_GUESS_PATTERN = /^[A-Z]{5}$/;

type WordleAttemptRow = Pick<
  Tables<"wordle_attempts">,
  | "completed_at"
  | "created_at"
  | "event_id"
  | "id"
  | "player_id"
  | "puzzle_id"
  | "submitted_guesses"
  | "updated_at"
  | "version"
>;

type WordleAttemptWithPuzzleRow = WordleAttemptRow & {
  puzzle: StoredWordlePuzzleRow | null;
};

type DecodedWordleAttempt = {
  row: WordleAttemptRow;
  state: WordleGameState;
};

type StartWordleAttemptInput = {
  player: CurrentPlayer;
  puzzleId: string;
  startMode: "resume" | "new";
};

export type StartWordleAttemptResult =
  { status: "ready"; attempt: WordleAttemptSnapshot } | { status: "not_found" };

type SubmitWordleGuessInput = {
  player: CurrentPlayer;
  attemptId: string;
  guess: string;
  version: number;
};

export type SubmitWordleGuessResult =
  | { status: "submitted"; attempt: WordleAttemptSnapshot }
  | { status: "not_found" }
  | { status: "invalid_request" }
  | { status: "invalid_word"; attempt: WordleAttemptSnapshot }
  | { status: "invalid_action"; attempt: WordleAttemptSnapshot }
  | { status: "stale"; attempt: WordleAttemptSnapshot };

export async function startWordleAttempt({
  player,
  puzzleId,
  startMode,
}: StartWordleAttemptInput): Promise<StartWordleAttemptResult> {
  const storedPuzzle = await getWordlePuzzleForEvent(player.eventId, puzzleId);

  if (!storedPuzzle) {
    return { status: "not_found" };
  }

  const activeAttempt = await loadActiveAttempt(
    player,
    storedPuzzle.databaseId,
  );

  if (activeAttempt) {
    return readyResult(activeAttempt, storedPuzzle.puzzle);
  }

  if (startMode === "resume") {
    const latestAttempt = await loadLatestAttempt(
      player,
      storedPuzzle.databaseId,
    );

    if (latestAttempt) {
      return readyResult(latestAttempt, storedPuzzle.puzzle);
    }
  }

  return createAttemptOrRecoverRace(player, storedPuzzle);
}

export async function submitWordleGuess({
  player,
  attemptId,
  guess,
  version,
}: SubmitWordleGuessInput): Promise<SubmitWordleGuessResult> {
  const loaded = await loadAttemptWithPuzzle({
    attemptId,
    eventId: player.eventId,
    playerId: player.id,
  });

  if (!loaded) {
    return { status: "not_found" };
  }

  const { attempt, storedPuzzle } = loaded;
  const decodedAttempt = decodeAttempt(attempt, storedPuzzle.puzzle);
  const currentSnapshot = createSnapshot(decodedAttempt, storedPuzzle.puzzle);

  if (version !== attempt.version) {
    return { status: "stale", attempt: currentSnapshot };
  }

  if (getWordleGameStatus(decodedAttempt.state) !== "playing") {
    return { status: "invalid_action", attempt: currentSnapshot };
  }

  let normalizedGuess: string;

  try {
    normalizedGuess = normalizeWordleGuess(guess);
  } catch {
    return { status: "invalid_request" };
  }

  if (
    normalizedGuess !== storedPuzzle.puzzle.answer &&
    !isAcceptedWordleGuess(normalizedGuess)
  ) {
    return { status: "invalid_word", attempt: currentSnapshot };
  }

  const submission = submitDomainWordleGuess(storedPuzzle.puzzle.answer, {
    ...decodedAttempt.state,
    currentGuess: normalizedGuess,
  });

  if (submission.status !== "submitted") {
    throw new Error("Failed to apply the authoritative Wordle guess.");
  }

  const nextStatus = getWordleGameStatus(submission.state);
  const nextGuesses = submission.state.submittedGuesses.map(
    ({ guess: submittedGuess }) => submittedGuess,
  );
  const now = new Date().toISOString();
  const { data: updatedAttempt, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .update({
      completed_at: nextStatus === "playing" ? null : now,
      submitted_guesses: nextGuesses,
      updated_at: now,
      version: attempt.version + 1,
    })
    .eq("id", attempt.id)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("version", attempt.version)
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to update the Wordle Attempt.");
  }

  if (!updatedAttempt) {
    const winningAttempt = await loadAttempt({
      attemptId: attempt.id,
      eventId: player.eventId,
      playerId: player.id,
    });

    if (!winningAttempt) {
      throw new Error("Failed to reload the Wordle Attempt.");
    }

    return {
      status: "stale",
      attempt: createSnapshot(
        decodeAttempt(winningAttempt, storedPuzzle.puzzle),
        storedPuzzle.puzzle,
      ),
    };
  }

  return {
    status: "submitted",
    attempt: createSnapshot(
      decodeAttempt(updatedAttempt, storedPuzzle.puzzle),
      storedPuzzle.puzzle,
    ),
  };
}

async function createAttemptOrRecoverRace(
  player: CurrentPlayer,
  storedPuzzle: StoredWordlePuzzle,
): Promise<StartWordleAttemptResult> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .insert({
      event_id: player.eventId,
      player_id: player.id,
      puzzle_id: storedPuzzle.databaseId,
    })
    .select(ATTEMPT_COLUMNS)
    .single();

  if (error) {
    if (!isActiveAttemptConflict(error)) {
      throw new Error("Failed to create the Wordle Attempt.");
    }

    const activeAttempt = await loadActiveAttempt(
      player,
      storedPuzzle.databaseId,
    );

    if (!activeAttempt) {
      throw new Error("Failed to recover the active Wordle Attempt.");
    }

    return readyResult(activeAttempt, storedPuzzle.puzzle);
  }

  return readyResult(data, storedPuzzle.puzzle);
}

function readyResult(
  row: WordleAttemptRow,
  puzzle: WordlePuzzle,
): StartWordleAttemptResult {
  return {
    status: "ready",
    attempt: createSnapshot(decodeAttempt(row, puzzle), puzzle),
  };
}

async function loadActiveAttempt(
  player: CurrentPlayer,
  puzzleId: string,
): Promise<WordleAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("puzzle_id", puzzleId)
    .is("completed_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the active Wordle Attempt.");
  }

  return data;
}

async function loadLatestAttempt(
  player: CurrentPlayer,
  puzzleId: string,
): Promise<WordleAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("puzzle_id", puzzleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the latest Wordle Attempt.");
  }

  return data;
}

async function loadAttempt({
  attemptId,
  eventId,
  playerId,
}: {
  attemptId: string;
  eventId: string;
  playerId: string;
}): Promise<WordleAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", attemptId)
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the Wordle Attempt.");
  }

  return data;
}

async function loadAttemptWithPuzzle({
  attemptId,
  eventId,
  playerId,
}: {
  attemptId: string;
  eventId: string;
  playerId: string;
}): Promise<{
  attempt: WordleAttemptRow;
  storedPuzzle: StoredWordlePuzzle;
} | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_attempts")
    .select(ATTEMPT_WITH_PUZZLE_COLUMNS)
    .eq("id", attemptId)
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the Wordle Attempt and puzzle.");
  }

  if (!data) {
    return null;
  }

  const { puzzle, ...attempt } = data as WordleAttemptWithPuzzleRow;

  if (!puzzle) {
    throw new Error("Wordle Attempt is missing its authoritative puzzle.");
  }

  return {
    attempt,
    storedPuzzle: decodeStoredWordlePuzzle(puzzle),
  };
}

function decodeAttempt(
  row: WordleAttemptRow,
  puzzle: WordlePuzzle,
): DecodedWordleAttempt {
  if (
    !Array.isArray(row.submitted_guesses) ||
    row.submitted_guesses.length > WORDLE_MAX_ATTEMPTS ||
    row.submitted_guesses.some(
      (guess) => typeof guess !== "string" || !STORED_GUESS_PATTERN.test(guess),
    ) ||
    row.version !== row.submitted_guesses.length
  ) {
    throw new Error(`Wordle Attempt "${row.id}" has invalid game state.`);
  }

  let state: WordleGameState = {
    currentGuess: "",
    submittedGuesses: [],
  };

  for (const guess of row.submitted_guesses) {
    const result = submitDomainWordleGuess(puzzle.answer, {
      ...state,
      currentGuess: guess,
    });

    if (result.status !== "submitted") {
      throw new Error(`Wordle Attempt "${row.id}" has invalid game state.`);
    }

    state = result.state;
  }

  const isTerminal = getWordleGameStatus(state) !== "playing";

  if ((row.completed_at !== null) !== isTerminal) {
    throw new Error(`Wordle Attempt "${row.id}" has invalid terminal state.`);
  }

  return { row, state };
}

function createSnapshot(
  attempt: DecodedWordleAttempt,
  puzzle: WordlePuzzle,
): WordleAttemptSnapshot {
  const gameStatus = getWordleGameStatus(attempt.state);

  return {
    attemptId: attempt.row.id,
    version: attempt.row.version,
    submittedGuesses: attempt.state.submittedGuesses,
    gameStatus,
    ...(gameStatus === "lost" ? { revealedAnswer: puzzle.answer } : {}),
  };
}

function isActiveAttemptConflict(error: {
  code?: string;
  details?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23505" &&
    `${error.message ?? ""} ${error.details ?? ""}`.includes(
      ACTIVE_ATTEMPT_INDEX,
    )
  );
}
