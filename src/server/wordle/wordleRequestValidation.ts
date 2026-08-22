import "server-only";

import type {
  StartWordleAttemptRequest,
  SubmitWordleGuessRequest,
} from "@/contracts/wordle";

const PUZZLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORD_PATTERN = /^[A-Za-z]{5}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseStartWordleAttemptRequest(
  value: unknown,
): StartWordleAttemptRequest | null {
  if (
    !isRecord(value) ||
    !isPuzzleId(value.puzzleId) ||
    (value.startMode !== undefined &&
      value.startMode !== "resume" &&
      value.startMode !== "new")
  ) {
    return null;
  }

  return {
    puzzleId: value.puzzleId,
    ...(value.startMode ? { startMode: value.startMode } : {}),
  };
}

export function parseSubmitWordleGuessRequest(
  value: unknown,
): SubmitWordleGuessRequest | null {
  if (
    !isRecord(value) ||
    typeof value.guess !== "string" ||
    !WORD_PATTERN.test(value.guess) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 0
  ) {
    return null;
  }

  return { guess: value.guess, version: value.version };
}

export function isWordleAttemptId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isPuzzleId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 100 &&
    PUZZLE_ID_PATTERN.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
