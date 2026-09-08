import type {
  StrandsGameplayErrorResponse,
  StrandsPathResponse,
} from "@/contracts/strands";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";
import { submitStrandsPath } from "@/server/strands/strandsAttempts";
import {
  isStrandsAttemptId,
  parseSubmitStrandsPathRequest,
} from "@/server/strands/strandsRequestValidation";

export async function POST(
  request: Request,
  context: RouteContext<"/api/games/strands/attempts/[attemptId]/paths">,
) {
  try {
    const { attemptId } = await context.params;
    const body = await readJson(request);
    const input = parseSubmitStrandsPathRequest(body);

    if (!isStrandsAttemptId(attemptId) || !input) {
      return gameplayError("invalid_request", 400);
    }

    const currentPlayer = await getCurrentPlayer();

    if (currentPlayer.status === "unauthenticated") {
      return gameplayError("authenticated_player_required", 401);
    }

    if (currentPlayer.status === "player_missing") {
      return gameplayError("player_not_ready", 409);
    }

    const result = await submitStrandsPath({
      player: currentPlayer.player,
      attemptId,
      ...input,
    });

    switch (result.status) {
      case "not_found":
        return gameplayError("strands_resource_not_found", 404);
      case "stale":
        return Response.json(
          {
            error: "stale_attempt",
            attempt: result.attempt,
          } satisfies StrandsGameplayErrorResponse,
          { status: 409 },
        );
      case "invalid_action":
        return Response.json(
          {
            error: "invalid_action",
            attempt: result.attempt,
          } satisfies StrandsGameplayErrorResponse,
          { status: 409 },
        );
      case "submitted":
        return Response.json({
          outcome: result.outcome,
          attempt: result.attempt,
        } satisfies StrandsPathResponse);
    }
  } catch {
    console.error("Strands path submission failed.");
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
