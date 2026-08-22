import type {
  WordleAttemptResponse,
  WordleGameplayErrorResponse,
} from "@/contracts/wordle";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";
import { submitWordleGuess } from "@/server/wordle/wordleAttempts";
import {
  isWordleAttemptId,
  parseSubmitWordleGuessRequest,
} from "@/server/wordle/wordleRequestValidation";

export async function POST(
  request: Request,
  context: RouteContext<"/api/games/wordle/attempts/[attemptId]/guesses">,
) {
  try {
    const { attemptId } = await context.params;
    const body = await readJson(request);
    const input = parseSubmitWordleGuessRequest(body);

    if (!isWordleAttemptId(attemptId) || !input) {
      return gameplayError("invalid_request", 400);
    }

    const currentPlayer = await getCurrentPlayer();

    if (currentPlayer.status === "unauthenticated") {
      return gameplayError("authenticated_player_required", 401);
    }

    if (currentPlayer.status === "player_missing") {
      return gameplayError("player_not_ready", 409);
    }

    const result = await submitWordleGuess({
      player: currentPlayer.player,
      attemptId,
      ...input,
    });

    switch (result.status) {
      case "not_found":
        return gameplayError("wordle_resource_not_found", 404);
      case "invalid_request":
        return gameplayError("invalid_request", 400);
      case "invalid_word":
        return Response.json(
          {
            error: "invalid_word",
            attempt: result.attempt,
          } satisfies WordleGameplayErrorResponse,
          { status: 422 },
        );
      case "stale":
        return Response.json(
          {
            error: "stale_attempt",
            attempt: result.attempt,
          } satisfies WordleGameplayErrorResponse,
          { status: 409 },
        );
      case "invalid_action":
        return Response.json(
          {
            error: "invalid_action",
            attempt: result.attempt,
          } satisfies WordleGameplayErrorResponse,
          { status: 409 },
        );
      case "submitted":
        return Response.json({
          attempt: result.attempt,
        } satisfies WordleAttemptResponse);
    }
  } catch {
    console.error("Wordle guess submission failed.");
    return gameplayError("wordle_gameplay_unavailable", 503);
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
  error: WordleGameplayErrorResponse["error"],
  status: number,
) {
  return Response.json({ error } satisfies WordleGameplayErrorResponse, {
    status,
  });
}
