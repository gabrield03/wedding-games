import type {
  StrandsGameplayErrorResponse,
  StrandsHintResponse,
} from "@/contracts/strands";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";
import { requestStrandsHint } from "@/server/strands/strandsAttempts";
import {
  isStrandsAttemptId,
  parseRequestStrandsHintRequest,
} from "@/server/strands/strandsRequestValidation";

export async function POST(
  request: Request,
  context: RouteContext<"/api/games/strands/attempts/[attemptId]/hints">,
) {
  try {
    const { attemptId } = await context.params;
    const body = await readJson(request);
    const input = parseRequestStrandsHintRequest(body);

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

    const result = await requestStrandsHint({
      player: currentPlayer.player,
      attemptId,
      version: input.version,
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
      case "ready":
        return Response.json({
          attempt: result.attempt,
        } satisfies StrandsHintResponse);
    }
  } catch {
    console.error("Strands hint request failed.");
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
