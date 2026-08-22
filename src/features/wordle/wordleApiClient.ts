import type {
  StartWordleAttemptRequest,
  SubmitWordleGuessRequest,
  WordleAttemptResponse,
  WordleAttemptSnapshot,
  WordleGameplayErrorCode,
  WordleGameplayErrorResponse,
} from "@/contracts/wordle";
import { WORDLE_MAX_ATTEMPTS } from "@/domain/wordle/gameplay";
import {
  WORDLE_WORD_LENGTH,
  type WordleGameStatus,
  type WordleLetterStatus,
  type WordleSubmittedGuess,
} from "@/domain/wordle/types";

export type StartWordleAttemptClientResult =
  | { status: "ready"; attempt: WordleAttemptSnapshot }
  | {
      status: "error";
      error: WordleGameplayErrorCode;
      attempt?: WordleAttemptSnapshot;
    };

export type SubmitWordleGuessClientResult =
  | { status: "submitted"; attempt: WordleAttemptSnapshot }
  | {
      status: "error";
      error: WordleGameplayErrorCode;
      attempt?: WordleAttemptSnapshot;
    };

export async function requestWordleAttempt(
  input: StartWordleAttemptRequest,
): Promise<StartWordleAttemptClientResult> {
  const response = await fetch("/api/games/wordle/attempts", {
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

  throw new Error("Wordle Attempt response was invalid.");
}

export async function requestWordleGuess(
  attemptId: string,
  input: SubmitWordleGuessRequest,
): Promise<SubmitWordleGuessClientResult> {
  const response = await fetch(
    `/api/games/wordle/attempts/${encodeURIComponent(attemptId)}/guesses`,
    {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await readJson(response);

  if (response.ok && isAttemptResponse(body)) {
    return { status: "submitted", attempt: body.attempt };
  }

  if (isGameplayErrorResponse(body)) {
    return {
      status: "error",
      error: body.error,
      ...(body.attempt ? { attempt: body.attempt } : {}),
    };
  }

  throw new Error("Wordle guess response was invalid.");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAttemptResponse(value: unknown): value is WordleAttemptResponse {
  return isRecord(value) && isAttemptSnapshot(value.attempt);
}

function isGameplayErrorResponse(
  value: unknown,
): value is WordleGameplayErrorResponse {
  return (
    isRecord(value) &&
    isGameplayErrorCode(value.error) &&
    (value.attempt === undefined || isAttemptSnapshot(value.attempt))
  );
}

function isAttemptSnapshot(value: unknown): value is WordleAttemptSnapshot {
  if (
    !isRecord(value) ||
    typeof value.attemptId !== "string" ||
    !Number.isInteger(value.version) ||
    typeof value.version !== "number"
  ) {
    return false;
  }

  const submittedGuesses = value.submittedGuesses;
  const gameStatus = value.gameStatus;

  if (
    !Array.isArray(submittedGuesses) ||
    !submittedGuesses.every(isSubmittedGuess) ||
    value.version !== submittedGuesses.length ||
    submittedGuesses.length > WORDLE_MAX_ATTEMPTS ||
    !isGameStatus(gameStatus)
  ) {
    return false;
  }

  if (gameStatus === "lost") {
    return (
      submittedGuesses.length === WORDLE_MAX_ATTEMPTS &&
      isCanonicalWord(value.revealedAnswer)
    );
  }

  if (value.revealedAnswer !== undefined) {
    return false;
  }

  if (gameStatus === "won") {
    const finalGuess = submittedGuesses.at(-1);

    return (
      finalGuess !== undefined &&
      finalGuess.evaluation.every(({ status }) => status === "correct")
    );
  }

  return submittedGuesses.length < WORDLE_MAX_ATTEMPTS;
}

function isSubmittedGuess(value: unknown): value is WordleSubmittedGuess {
  if (!isRecord(value) || !isCanonicalWord(value.guess)) {
    return false;
  }

  const guess = value.guess;

  return (
    Array.isArray(value.evaluation) &&
    value.evaluation.length === WORDLE_WORD_LENGTH &&
    value.evaluation.every(
      (entry, index) =>
        isRecord(entry) &&
        entry.letter === guess[index] &&
        isLetterStatus(entry.status),
    )
  );
}

function isCanonicalWord(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{5}$/.test(value);
}

function isLetterStatus(value: unknown): value is WordleLetterStatus {
  return value === "correct" || value === "present" || value === "absent";
}

function isGameStatus(value: unknown): value is WordleGameStatus {
  return value === "playing" || value === "won" || value === "lost";
}

function isGameplayErrorCode(value: unknown): value is WordleGameplayErrorCode {
  return (
    value === "authenticated_player_required" ||
    value === "player_not_ready" ||
    value === "wordle_resource_not_found" ||
    value === "invalid_request" ||
    value === "invalid_word" ||
    value === "stale_attempt" ||
    value === "invalid_action" ||
    value === "wordle_gameplay_unavailable"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
