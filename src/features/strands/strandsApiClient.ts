import type {
  PublicStrandsPuzzle,
  RequestStrandsHintRequest,
  RevealedStrandsAnswer,
  StartStrandsAttemptRequest,
  StrandsAttemptResponse,
  StrandsAttemptSnapshot,
  StrandsGameplayErrorCode,
  StrandsGameplayErrorResponse,
  StrandsHintResponse,
  StrandsPathOutcome,
  StrandsPathResponse,
  SubmitStrandsPathRequest,
} from "@/contracts/strands";
import { STRANDS_TILE_COUNT } from "@/domain/strands/types";

export type StartStrandsAttemptClientResult =
  | { status: "ready"; attempt: StrandsAttemptSnapshot }
  | ClientErrorResult;

export type SubmitStrandsPathClientResult =
  | {
      status: "submitted";
      outcome: StrandsPathOutcome;
      attempt: StrandsAttemptSnapshot;
    }
  | ClientErrorResult;

export type RequestStrandsHintClientResult =
  | { status: "ready"; attempt: StrandsAttemptSnapshot }
  | ClientErrorResult;

type ClientErrorResult = {
  status: "error";
  error: StrandsGameplayErrorCode;
  attempt?: StrandsAttemptSnapshot;
};

export async function requestStrandsAttempt(
  input: StartStrandsAttemptRequest,
): Promise<StartStrandsAttemptClientResult> {
  const response = await fetch("/api/games/strands/attempts", {
    body: JSON.stringify(input),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const body: unknown = await readJson(response);

  if (response.ok && isAttemptResponse(body)) {
    return { status: "ready", attempt: body.attempt };
  }

  return parseErrorResponse(body, "Strands Attempt response was invalid.");
}

export async function requestStrandsPath(
  attemptId: string,
  input: SubmitStrandsPathRequest,
): Promise<SubmitStrandsPathClientResult> {
  const response = await fetch(
    `/api/games/strands/attempts/${encodeURIComponent(attemptId)}/paths`,
    {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await readJson(response);

  if (response.ok && isPathResponse(body)) {
    return {
      status: "submitted",
      outcome: body.outcome,
      attempt: body.attempt,
    };
  }

  return parseErrorResponse(body, "Strands path response was invalid.");
}

export async function requestStrandsHint(
  attemptId: string,
  input: RequestStrandsHintRequest,
): Promise<RequestStrandsHintClientResult> {
  const response = await fetch(
    `/api/games/strands/attempts/${encodeURIComponent(attemptId)}/hints`,
    {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await readJson(response);

  if (response.ok && isHintResponse(body)) {
    return { status: "ready", attempt: body.attempt };
  }

  return parseErrorResponse(body, "Strands hint response was invalid.");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseErrorResponse(
  body: unknown,
  invalidResponseMessage: string,
): ClientErrorResult {
  if (isGameplayErrorResponse(body)) {
    return {
      status: "error",
      error: body.error,
      ...(body.attempt ? { attempt: body.attempt } : {}),
    };
  }

  throw new Error(invalidResponseMessage);
}

function isAttemptResponse(value: unknown): value is StrandsAttemptResponse {
  return isRecord(value) && isAttemptSnapshot(value.attempt);
}

function isPathResponse(value: unknown): value is StrandsPathResponse {
  return (
    isRecord(value) &&
    isPathOutcome(value.outcome) &&
    isAttemptSnapshot(value.attempt)
  );
}

function isHintResponse(value: unknown): value is StrandsHintResponse {
  return isRecord(value) && isAttemptSnapshot(value.attempt);
}

function isGameplayErrorResponse(
  value: unknown,
): value is StrandsGameplayErrorResponse {
  return (
    isRecord(value) &&
    isGameplayErrorCode(value.error) &&
    (value.attempt === undefined || isAttemptSnapshot(value.attempt))
  );
}

function isAttemptSnapshot(value: unknown): value is StrandsAttemptSnapshot {
  if (
    !isRecord(value) ||
    typeof value.attemptId !== "string" ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    !isPublicPuzzle(value.puzzle) ||
    !Array.isArray(value.foundAnswers) ||
    !isHintedTileIndexes(value.hintedTileIndexes) ||
    (value.gameStatus !== "playing" && value.gameStatus !== "complete")
  ) {
    return false;
  }

  const puzzle = value.puzzle;
  const foundAnswers = value.foundAnswers;

  if (
    !foundAnswers.every((answer) =>
      isRevealedAnswer(answer, puzzle.answerCount),
    )
  ) {
    return false;
  }

  const foundWords = foundAnswers.map(({ word }) => word);

  return (
    new Set(foundWords).size === foundWords.length &&
    foundAnswers.length <= puzzle.answerCount
  );
}

function isPublicPuzzle(value: unknown): value is PublicStrandsPuzzle {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.themeClue !== "string" ||
    !isRecord(value.grid) ||
    typeof value.grid.rows !== "number" ||
    !Number.isInteger(value.grid.rows) ||
    typeof value.grid.columns !== "number" ||
    !Number.isInteger(value.grid.columns) ||
    typeof value.grid.letters !== "string" ||
    typeof value.answerCount !== "number" ||
    !Number.isInteger(value.answerCount)
  ) {
    return false;
  }

  return (
    value.grid.rows > 0 &&
    value.grid.columns > 0 &&
    value.grid.rows * value.grid.columns === STRANDS_TILE_COUNT &&
    /^[A-Z]+$/.test(value.grid.letters) &&
    value.grid.letters.length === STRANDS_TILE_COUNT &&
    value.answerCount >= 1
  );
}

function isRevealedAnswer(
  value: unknown,
  answerCount: number,
): value is RevealedStrandsAnswer {
  if (
    !isRecord(value) ||
    typeof value.word !== "string" ||
    !/^[A-Z]{4,}$/.test(value.word) ||
    !isTilePath(value.path)
  ) {
    return false;
  }

  if (value.kind === "spangram") {
    return value.themeIndex === undefined;
  }

  return (
    value.kind === "theme" &&
    typeof value.themeIndex === "number" &&
    Number.isInteger(value.themeIndex) &&
    value.themeIndex >= 0 &&
    value.themeIndex < answerCount - 1
  );
}

function isHintedTileIndexes(value: unknown): value is number[] | null {
  return value === null || isTilePath(value);
}

function isTilePath(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= STRANDS_TILE_COUNT &&
    value.every(
      (tileIndex) =>
        typeof tileIndex === "number" &&
        Number.isInteger(tileIndex) &&
        tileIndex >= 0 &&
        tileIndex < STRANDS_TILE_COUNT,
    ) &&
    new Set(value).size === value.length
  );
}

function isPathOutcome(value: unknown): value is StrandsPathOutcome {
  return (
    value === "found_theme" ||
    value === "found_spangram" ||
    value === "already_found" ||
    value === "not_theme" ||
    value === "invalid_path" ||
    value === "game_complete"
  );
}

function isGameplayErrorCode(
  value: unknown,
): value is StrandsGameplayErrorCode {
  return (
    value === "authenticated_player_required" ||
    value === "player_not_ready" ||
    value === "strands_resource_not_found" ||
    value === "invalid_request" ||
    value === "stale_attempt" ||
    value === "invalid_action" ||
    value === "strands_gameplay_unavailable"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
