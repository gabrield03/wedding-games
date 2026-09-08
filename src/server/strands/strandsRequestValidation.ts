import "server-only";

import type { StartStrandsAttemptRequest } from "@/contracts/strands";

const PUZZLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseStartStrandsAttemptRequest(
  value: unknown,
): StartStrandsAttemptRequest | null {
  if (
    !isRecord(value) ||
    typeof value.puzzleId !== "string" ||
    value.puzzleId.length < 1 ||
    value.puzzleId.length > 100 ||
    !PUZZLE_ID_PATTERN.test(value.puzzleId)
  ) {
    return null;
  }

  return { puzzleId: value.puzzleId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
