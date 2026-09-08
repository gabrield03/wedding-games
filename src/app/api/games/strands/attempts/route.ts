import type {
  StrandsAttemptResponse,
  StrandsGameplayErrorResponse,
} from "@/contracts/strands";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";
import { startStrandsAttempt } from "@/server/strands/strandsAttempts";
import { parseStartStrandsAttemptRequest } from "@/server/strands/strandsRequestValidation";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = parseStartStrandsAttemptRequest(body);

    if (!input) {
      return gameplayError("invalid_request", 400);
    }

    const currentPlayer = await getCurrentPlayer();

    if (currentPlayer.status === "unauthenticated") {
      return gameplayError("authenticated_player_required", 401);
    }

    if (currentPlayer.status === "player_missing") {
      return gameplayError("player_not_ready", 409);
    }

    const result = await startStrandsAttempt({
      player: currentPlayer.player,
      puzzleId: input.puzzleId,
    });

    if (result.status === "not_found") {
      return gameplayError("strands_resource_not_found", 404);
    }

    return Response.json({
      attempt: result.attempt,
    } satisfies StrandsAttemptResponse);
  } catch {
    console.error("Strands Attempt start failed.");
    return gameplayError("strands_gameplay_unavailable", 503);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function gameplayError(
  error: StrandsGameplayErrorResponse["error"],
  status: number,
) {
  return Response.json({ error } satisfies StrandsGameplayErrorResponse, {
    status,
  });
}
