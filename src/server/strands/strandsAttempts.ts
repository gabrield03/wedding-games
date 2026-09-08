import "server-only";

import type {
  RevealedStrandsAnswer,
  StrandsAttemptSnapshot,
} from "@/contracts/strands";
import {
  getStrandsPuzzleForEvent,
  type StoredStrandsPuzzle,
} from "@/content/strands/getStrandsPuzzle";
import { getStrandsGameStatus } from "@/domain/strands/gameplay";
import type {
  StrandsAnswer,
  StrandsGameState,
  StrandsPuzzle,
} from "@/domain/strands/types";
import type { CurrentPlayer } from "@/server/players/getCurrentPlayer";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

const ATTEMPT_COLUMNS =
  "id, event_id, player_id, puzzle_id, found_words, version, created_at, updated_at, completed_at";
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
