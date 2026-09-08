import "server-only";

import type {
  RequestStrandsHintRequest,
  StartStrandsAttemptRequest,
  SubmitStrandsPathRequest,
} from "@/contracts/strands";
import { STRANDS_TILE_COUNT } from "@/domain/strands/types";

const PUZZLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function parseSubmitStrandsPathRequest(
  value: unknown,
): SubmitStrandsPathRequest | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.path) ||
    value.path.length > STRANDS_TILE_COUNT ||
    value.path.some(
      (tileIndex) =>
        typeof tileIndex !== "number" ||
        !Number.isInteger(tileIndex) ||
        tileIndex < 0 ||
        tileIndex >= STRANDS_TILE_COUNT,
    ) ||
    !isVersion(value.version)
  ) {
    return null;
  }

  return {
    path: value.path as number[],
    version: value.version,
  };
}

export function parseRequestStrandsHintRequest(
  value: unknown,
): RequestStrandsHintRequest | null {
  if (!isRecord(value) || !isVersion(value.version)) {
    return null;
  }

  return { version: value.version };
}

export function isStrandsAttemptId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
