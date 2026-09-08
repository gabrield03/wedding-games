import "server-only";

import type {
  RevealedStrandsAnswer,
  StrandsAttemptSnapshot,
  StrandsPathOutcome,
} from "@/contracts/strands";
import {
  decodeStoredStrandsPuzzle,
  getStrandsPuzzleForEvent,
  type StoredStrandsPuzzle,
  type StoredStrandsPuzzleRow,
} from "@/content/strands/getStrandsPuzzle";
import {
  getStrandsGameStatus,
  submitStrandsPath as submitDomainStrandsPath,
} from "@/domain/strands/gameplay";
import type {
  StrandsAnswer,
  StrandsGameState,
  StrandsPath,
  StrandsPuzzle,
} from "@/domain/strands/types";
import type { CurrentPlayer } from "@/server/players/getCurrentPlayer";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

const ATTEMPT_COLUMNS =
  "id, event_id, player_id, puzzle_id, found_words, version, created_at, updated_at, completed_at";
const ATTEMPT_WITH_PUZZLE_COLUMNS =
  "id, event_id, player_id, puzzle_id, found_words, version, created_at, updated_at, completed_at, puzzle:strands_puzzles!strands_attempts_puzzle_fkey(id, event_id, public_id, theme_clue, grid_rows, grid_columns, grid_letters, theme_words, spangram)";
const ACTIVE_ATTEMPT_INDEX =
  "strands_attempts_one_active_per_player_puzzle_idx";

type StrandsAttemptRow = Pick<
  Tables<"strands_attempts">,
  | "completed_at"
  | "created_at"
  | "event_id"
  | "found_words"
  | "id"
  | "player_id"
  | "puzzle_id"
  | "updated_at"
  | "version"
>;

type StrandsAttemptWithPuzzleRow = StrandsAttemptRow & {
  puzzle: StoredStrandsPuzzleRow | null;
};

type DecodedStrandsAttempt = {
  row: StrandsAttemptRow;
  state: StrandsGameState;
};

type StartStrandsAttemptInput = {
  player: CurrentPlayer;
  puzzleId: string;
};

export type StartStrandsAttemptResult =
  | { status: "ready"; attempt: StrandsAttemptSnapshot }
  | { status: "not_found" };

type SubmitStrandsPathInput = {
  player: CurrentPlayer;
  attemptId: string;
  path: StrandsPath;
  version: number;
};

export type SubmitStrandsPathResult =
  | {
      status: "submitted";
      outcome: StrandsPathOutcome;
      attempt: StrandsAttemptSnapshot;
    }
  | { status: "not_found" }
  | { status: "invalid_action"; attempt: StrandsAttemptSnapshot }
  | { status: "stale"; attempt: StrandsAttemptSnapshot };

export async function startStrandsAttempt({
  player,
  puzzleId,
}: StartStrandsAttemptInput): Promise<StartStrandsAttemptResult> {
  const storedPuzzle = await getStrandsPuzzleForEvent(player.eventId, puzzleId);

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

  return createAttemptOrRecoverRace(player, storedPuzzle);
}

export async function submitStrandsPath({
  player,
  attemptId,
  path,
  version,
}: SubmitStrandsPathInput): Promise<SubmitStrandsPathResult> {
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

  if (
    getStrandsGameStatus(storedPuzzle.puzzle, decodedAttempt.state) ===
    "complete"
  ) {
    return { status: "invalid_action", attempt: currentSnapshot };
  }

  const submission = submitDomainStrandsPath(storedPuzzle.puzzle, {
    selectedPath: path,
    foundWords: decodedAttempt.state.foundWords,
  });

  if (
    submission.status === "already_found" ||
    submission.status === "not_theme" ||
    submission.status === "invalid_path"
  ) {
    return {
      status: "submitted",
      outcome: submission.status,
      attempt: currentSnapshot,
    };
  }

  if (
    submission.status === "game_complete" &&
    submission.completedBy === undefined
  ) {
    return { status: "invalid_action", attempt: currentSnapshot };
  }

  const nextGameStatus = getStrandsGameStatus(
    storedPuzzle.puzzle,
    submission.state,
  );
  const now = new Date().toISOString();
  const { data: updatedAttempt, error } = await getPrivilegedSupabaseClient()
    .from("strands_attempts")
    .update({
      completed_at: nextGameStatus === "complete" ? now : null,
      found_words: submission.state.foundWords,
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
    throw new Error("Failed to update the Strands Attempt.");
  }

  if (!updatedAttempt) {
    const winningAttempt = await loadAttempt({
      attemptId: attempt.id,
      eventId: player.eventId,
      playerId: player.id,
    });

    if (!winningAttempt) {
      throw new Error("Failed to reload the Strands Attempt.");
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
    outcome: submission.status,
    attempt: createSnapshot(
      decodeAttempt(updatedAttempt, storedPuzzle.puzzle),
      storedPuzzle.puzzle,
    ),
  };
}

async function createAttemptOrRecoverRace(
  player: CurrentPlayer,
  storedPuzzle: StoredStrandsPuzzle,
): Promise<StartStrandsAttemptResult> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("strands_attempts")
    .insert({
      event_id: player.eventId,
      player_id: player.id,
      puzzle_id: storedPuzzle.databaseId,
    })
    .select(ATTEMPT_COLUMNS)
    .single();

  if (error) {
    if (!isActiveAttemptConflict(error)) {
      throw new Error("Failed to create the Strands Attempt.");
    }

    const activeAttempt = await loadActiveAttempt(
      player,
      storedPuzzle.databaseId,
    );

    if (!activeAttempt) {
      throw new Error("Failed to recover the active Strands Attempt.");
    }

    return readyResult(activeAttempt, storedPuzzle.puzzle);
  }

  return readyResult(data, storedPuzzle.puzzle);
}

async function loadActiveAttempt(
  player: CurrentPlayer,
  puzzleId: string,
): Promise<StrandsAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("strands_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("puzzle_id", puzzleId)
    .is("completed_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the active Strands Attempt.");
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
}): Promise<StrandsAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("strands_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", attemptId)
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the Strands Attempt.");
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
  attempt: StrandsAttemptRow;
  storedPuzzle: StoredStrandsPuzzle;
} | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("strands_attempts")
    .select(ATTEMPT_WITH_PUZZLE_COLUMNS)
    .eq("id", attemptId)
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the Strands Attempt and puzzle.");
  }

  if (!data) {
    return null;
  }

  const { puzzle, ...attempt } = data as StrandsAttemptWithPuzzleRow;

  if (!puzzle) {
    throw new Error("Strands Attempt is missing its authoritative puzzle.");
  }

  return {
    attempt,
    storedPuzzle: decodeStoredStrandsPuzzle(puzzle),
  };
}

function readyResult(
  row: StrandsAttemptRow,
  puzzle: StrandsPuzzle,
): StartStrandsAttemptResult {
  const attempt = decodeAttempt(row, puzzle);

  return {
    status: "ready",
    attempt: createSnapshot(attempt, puzzle),
  };
}

function decodeAttempt(
  row: StrandsAttemptRow,
  puzzle: StrandsPuzzle,
): DecodedStrandsAttempt {
  const answerWords = new Set(
    [...puzzle.themeWords, puzzle.spangram].map(({ word }) => word),
  );

  if (
    !Array.isArray(row.found_words) ||
    row.found_words.some((word) => typeof word !== "string") ||
    new Set(row.found_words).size !== row.found_words.length ||
    row.found_words.some((word) => !answerWords.has(word)) ||
    !Number.isInteger(row.version) ||
    row.version < 0
  ) {
    throw new Error(`Strands Attempt "${row.id}" has invalid game state.`);
  }

  const state: StrandsGameState = {
    selectedPath: [],
    foundWords: row.found_words,
  };
  const gameStatus = getStrandsGameStatus(puzzle, state);

  if ((row.completed_at !== null) !== (gameStatus === "complete")) {
    throw new Error(
      `Strands Attempt "${row.id}" has inconsistent terminal state.`,
    );
  }

  return { row, state };
}

function createSnapshot(
  attempt: DecodedStrandsAttempt,
  puzzle: StrandsPuzzle,
): StrandsAttemptSnapshot {
  const foundWords = new Set(attempt.state.foundWords);

  return {
    attemptId: attempt.row.id,
    version: attempt.row.version,
    puzzle: {
      id: puzzle.id,
      themeClue: puzzle.themeClue,
      grid: puzzle.grid,
      answerCount: puzzle.themeWords.length + 1,
    },
    foundAnswers: getAnswers(puzzle)
      .filter(({ answer }) => foundWords.has(answer.word))
      .map(({ answer, kind }) => ({
        word: answer.word,
        kind,
        path: answer.path,
      })),
    gameStatus: getStrandsGameStatus(puzzle, attempt.state),
  };
}

function getAnswers(
  puzzle: StrandsPuzzle,
): Array<{ answer: StrandsAnswer; kind: RevealedStrandsAnswer["kind"] }> {
  return [
    ...puzzle.themeWords.map((answer) => ({
      answer,
      kind: "theme" as const,
    })),
    { answer: puzzle.spangram, kind: "spangram" as const },
  ];
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
