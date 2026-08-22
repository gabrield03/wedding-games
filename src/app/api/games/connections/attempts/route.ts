import type {
  ConnectionsAttemptResponse,
  ConnectionsGameplayErrorResponse,
} from "@/contracts/connections";
import { startConnectionsAttempt } from "@/server/connections/connectionsAttempts";
import { parseStartConnectionsAttemptRequest } from "@/server/connections/connectionsRequestValidation";
import {
  measureLatencyStage,
  setLatencyOutcome,
  withLatencyDiagnostic,
} from "@/server/diagnostics/latency";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";

export async function POST(request: Request) {
  return withLatencyDiagnostic("connections_attempt", request, async () => {
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

      let body: unknown;

      try {
        body = await request.json();
      } catch {
        setLatencyOutcome("invalid_request");
        return gameplayError("invalid_request", 400);
      }

      const input = parseStartConnectionsAttemptRequest(body);

      if (!input) {
        setLatencyOutcome("invalid_request");
        return gameplayError("invalid_request", 400);
      }

      const result = await measureLatencyStage("service", () =>
        startConnectionsAttempt({
          player: currentPlayer.player,
          ...input,
        }),
      );

      if (result.status === "not_found") {
        return gameplayError("connections_resource_not_found", 404);
      }

      if (result.status === "replay_not_complete") {
        return Response.json(
          {
            error: "attempt_not_complete",
            attempt: result.attempt,
          } satisfies ConnectionsGameplayErrorResponse,
          { status: 409 },
        );
      }

      return Response.json({
        attempt: result.attempt,
      } satisfies ConnectionsAttemptResponse);
    } catch {
      setLatencyOutcome("unavailable");
      console.error("Connections Attempt start failed.");

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
