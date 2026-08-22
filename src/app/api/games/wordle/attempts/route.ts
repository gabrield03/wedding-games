import type {
  WordleAttemptResponse,
  WordleGameplayErrorResponse,
} from "@/contracts/wordle";
import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";
import { startWordleAttempt } from "@/server/wordle/wordleAttempts";
import { parseStartWordleAttemptRequest } from "@/server/wordle/wordleRequestValidation";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = parseStartWordleAttemptRequest(body);

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

    const result = await startWordleAttempt({
      player: currentPlayer.player,
      puzzleId: input.puzzleId,
      startMode: input.startMode ?? "resume",
    });

    if (result.status === "not_found") {
      return gameplayError("wordle_resource_not_found", 404);
    }

    return Response.json({
      attempt: result.attempt,
    } satisfies WordleAttemptResponse);
  } catch {
    console.error("Wordle Attempt start failed.");
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
