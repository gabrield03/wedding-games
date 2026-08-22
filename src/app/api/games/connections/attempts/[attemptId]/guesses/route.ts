import type {
  ConnectionsGameplayErrorResponse,
  ConnectionsGuessResponse,
} from "@/contracts/connections";
import { submitConnectionsGuess } from "@/server/connections/connectionsAttempts";
import {
  isConnectionsAttemptId,
  parseSubmitConnectionsGuessRequest,
} from "@/server/connections/connectionsRequestValidation";
import {
  measureLatencyStage,
  setLatencyOutcome,
  withLatencyDiagnostic,
} from "@/server/diagnostics/latency";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";

export async function POST(
  request: Request,
  context: RouteContext<"/api/games/connections/attempts/[attemptId]/guesses">,
) {
  return withLatencyDiagnostic("connections_guess", request, async () => {
    try {
      const currentPlayer = await getCurrentPlayer();

      if (currentPlayer.status === "unauthenticated") {
        setLatencyOutcome("unauthenticated");
        return gameplayError("authenticated_player_required", 401);
      }

      if (currentPlayer.status === "player_missing") {
        setLatencyOutcome("player_missing");
        return gameplayError("player_not_ready", 409);
      }

      const { attemptId } = await context.params;

      if (!isConnectionsAttemptId(attemptId)) {
        setLatencyOutcome("invalid_request");
        return gameplayError("invalid_request", 400);
      }

      let body: unknown;

      try {
        body = await request.json();
      } catch {
        setLatencyOutcome("invalid_request");
        return gameplayError("invalid_request", 400);
      }

      const input = parseSubmitConnectionsGuessRequest(body);

      if (!input) {
        setLatencyOutcome("invalid_request");
        return gameplayError("invalid_request", 400);
      }

      const result = await measureLatencyStage("service", () =>
        submitConnectionsGuess({
          player: currentPlayer.player,
          attemptId,
          ...input,
        }),
      );

      switch (result.status) {
        case "not_found":
          return gameplayError("connections_resource_not_found", 404);

        case "invalid_request":
          return gameplayError("invalid_request", 400);

        case "invalid_action":
          return Response.json(
            {
              error: "invalid_action",
              attempt: result.attempt,
            } satisfies ConnectionsGameplayErrorResponse,
            { status: 409 },
          );

        case "stale":
          return Response.json(
            {
              error: "stale_attempt",
              attempt: result.attempt,
            } satisfies ConnectionsGameplayErrorResponse,
            { status: 409 },
          );

        case "submitted":
          return Response.json({
            outcome: result.outcome,
            attempt: result.attempt,
          } satisfies ConnectionsGuessResponse);
      }
    } catch {
      setLatencyOutcome("unavailable");
      console.error("Connections guess submission failed.");

      return gameplayError("connections_gameplay_unavailable", 503);
    }
  });
}

function gameplayError(
  error: ConnectionsGameplayErrorResponse["error"],
  status: number,
) {
  return Response.json({ error } satisfies ConnectionsGameplayErrorResponse, {
    status,
  });
}
