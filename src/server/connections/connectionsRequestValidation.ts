import "server-only";

import type {
  StartConnectionsAttemptRequest,
  SubmitConnectionsGuessRequest,
} from "@/contracts/connections";

const PUZZLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseStartConnectionsAttemptRequest(
  value: unknown,
): StartConnectionsAttemptRequest | null {
  if (!isRecord(value) || !isPuzzleId(value.puzzleId)) {
    return null;
  }

  if (
    value.replayFromAttemptId !== undefined &&
    !isUuid(value.replayFromAttemptId)
  ) {
    return null;
  }

  return {
    puzzleId: value.puzzleId,
    ...(value.replayFromAttemptId
      ? { replayFromAttemptId: value.replayFromAttemptId }
      : {}),
  };
}

export function parseSubmitConnectionsGuessRequest(
  value: unknown,
): SubmitConnectionsGuessRequest | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.tileIds) ||
    value.tileIds.length !== 4 ||
    !value.tileIds.every(isUuid) ||
    new Set(value.tileIds).size !== value.tileIds.length ||
    !Number.isInteger(value.version) ||
    typeof value.version !== "number" ||
    value.version < 0
  ) {
    return null;
  }

  return {
    tileIds: value.tileIds,
    version: value.version,
  };
}

export function isConnectionsAttemptId(value: unknown): value is string {
  return isUuid(value);
}

function isPuzzleId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 100 &&
    PUZZLE_ID_PATTERN.test(value)
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
