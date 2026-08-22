import type {
  ConnectionsAttemptResponse,
  ConnectionsGameplayErrorResponse,
} from "@/contracts/connections";
import { startConnectionsAttempt } from "@/server/connections/connectionsAttempts";
import { parseStartConnectionsAttemptRequest } from "@/server/connections/connectionsRequestValidation";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";

export async function POST(request: Request) {
  try {
    const currentPlayer = await getCurrentPlayer();

    if (currentPlayer.status === "unauthenticated") {
      return gameplayError("authenticated_player_required", 401);
    }

    if (currentPlayer.status === "player_missing") {
      return gameplayError("player_not_ready", 409);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return gameplayError("invalid_request", 400);
    }

    const input = parseStartConnectionsAttemptRequest(body);

    if (!input) {
      return gameplayError("invalid_request", 400);
    }

    const result = await startConnectionsAttempt({
      player: currentPlayer.player,
      ...input,
    });

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
    console.error("Connections Attempt start failed.");

    return gameplayError("connections_gameplay_unavailable", 503);
  }
}

function gameplayError(
  error: ConnectionsGameplayErrorResponse["error"],
  status: number,
) {
  return Response.json({ error } satisfies ConnectionsGameplayErrorResponse, {
    status,
  });
}
