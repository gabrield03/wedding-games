import type {
  ConnectionsAttemptResponse,
  ConnectionsAttemptSnapshot,
  ConnectionsGameplayErrorCode,
  ConnectionsGameplayErrorResponse,
  ConnectionsGuessOutcome,
  ConnectionsGuessResponse,
  StartConnectionsAttemptRequest,
  SubmitConnectionsGuessRequest,
} from "@/contracts/connections";

export type StartConnectionsAttemptClientResult =
  | { status: "ready"; attempt: ConnectionsAttemptSnapshot }
  | {
      status: "error";
      error: ConnectionsGameplayErrorCode;
      attempt?: ConnectionsAttemptSnapshot;
    };

export type SubmitConnectionsGuessClientResult =
  | {
      status: "submitted";
      outcome: ConnectionsGuessOutcome;
      attempt: ConnectionsAttemptSnapshot;
    }
  | {
      status: "error";
      error: ConnectionsGameplayErrorCode;
      attempt?: ConnectionsAttemptSnapshot;
    };

export async function requestConnectionsAttempt(
  input: StartConnectionsAttemptRequest,
): Promise<StartConnectionsAttemptClientResult> {
  const response = await fetch("/api/games/connections/attempts", {
    body: JSON.stringify(input),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const body: unknown = await readJson(response);

  if (response.ok && isAttemptResponse(body)) {
    return { status: "ready", attempt: body.attempt };
  }

  if (isGameplayErrorResponse(body)) {
    return {
      status: "error",
      error: body.error,
      ...(body.attempt ? { attempt: body.attempt } : {}),
    };
  }

  throw new Error("Connections Attempt response was invalid.");
}

export async function requestConnectionsGuess(
  attemptId: string,
  input: SubmitConnectionsGuessRequest,
): Promise<SubmitConnectionsGuessClientResult> {
  const response = await fetch(
    `/api/games/connections/attempts/${encodeURIComponent(attemptId)}/guesses`,
    {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await readJson(response);

  if (response.ok && isGuessResponse(body)) {
    return {
      status: "submitted",
      outcome: body.outcome,
      attempt: body.attempt,
    };
  }

  if (isGameplayErrorResponse(body)) {
    return {
      status: "error",
      error: body.error,
      ...(body.attempt ? { attempt: body.attempt } : {}),
    };
  }

  throw new Error("Connections guess response was invalid.");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAttemptResponse(
  value: unknown,
): value is ConnectionsAttemptResponse {
  return isRecord(value) && isAttemptSnapshot(value.attempt);
}

function isGuessResponse(value: unknown): value is ConnectionsGuessResponse {
  return (
    isRecord(value) &&
    isGuessOutcome(value.outcome) &&
    isAttemptSnapshot(value.attempt)
  );
}

function isGameplayErrorResponse(
  value: unknown,
): value is ConnectionsGameplayErrorResponse {
  return (
    isRecord(value) &&
    isGameplayErrorCode(value.error) &&
    (value.attempt === undefined || isAttemptSnapshot(value.attempt))
  );
}

function isAttemptSnapshot(
  value: unknown,
): value is ConnectionsAttemptSnapshot {
  return (
    isRecord(value) &&
    typeof value.attemptId === "string" &&
    Number.isInteger(value.version) &&
    typeof value.version === "number" &&
    value.version >= 0 &&
    Array.isArray(value.remainingTiles) &&
    value.remainingTiles.every(isPublicTile) &&
    Array.isArray(value.displayedGroups) &&
    value.displayedGroups.every(isRevealedGroup) &&
    Number.isInteger(value.mistakesRemaining) &&
    typeof value.mistakesRemaining === "number" &&
    value.mistakesRemaining >= 0 &&
    (value.gameStatus === "playing" ||
      value.gameStatus === "won" ||
      value.gameStatus === "lost")
  );
}

function isPublicTile(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string"
  );
}

function isRevealedGroup(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.category === "string" &&
    isGroupTier(value.tier) &&
    Array.isArray(value.tiles) &&
    value.tiles.every(isPublicTile)
  );
}

function isGroupTier(value: unknown) {
  return (
    value === "yellow" ||
    value === "green" ||
    value === "blue" ||
    value === "purple"
  );
}

function isGuessOutcome(value: unknown): value is ConnectionsGuessOutcome {
  return (
    value === "correct" ||
    value === "incorrect" ||
    value === "one_away" ||
    value === "duplicate"
  );
}

function isGameplayErrorCode(
  value: unknown,
): value is ConnectionsGameplayErrorCode {
  return (
    value === "authenticated_player_required" ||
    value === "player_not_ready" ||
    value === "connections_resource_not_found" ||
    value === "invalid_request" ||
    value === "stale_attempt" ||
    value === "invalid_action" ||
    value === "attempt_not_complete" ||
    value === "connections_gameplay_unavailable"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
