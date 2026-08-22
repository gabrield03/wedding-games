import type {
  WordleGameStatus,
  WordleSubmittedGuess,
} from "@/domain/wordle/types";

export type WordlePuzzlePreview = {
  id: string;
};

export type WordleAttemptSnapshot = {
  attemptId: string;
  version: number;
  submittedGuesses: WordleSubmittedGuess[];
  gameStatus: WordleGameStatus;
  revealedAnswer?: string;
};

export type StartWordleAttemptRequest = {
  puzzleId: string;
  startMode?: "resume" | "new";
};

export type SubmitWordleGuessRequest = {
  guess: string;
  version: number;
};

export type WordleAttemptResponse = {
  attempt: WordleAttemptSnapshot;
};

export type WordleGameplayErrorCode =
  | "authenticated_player_required"
  | "player_not_ready"
  | "wordle_resource_not_found"
  | "invalid_request"
  | "invalid_word"
  | "stale_attempt"
  | "invalid_action"
  | "wordle_gameplay_unavailable";

export type WordleGameplayErrorResponse = {
  error: WordleGameplayErrorCode;
  attempt?: WordleAttemptSnapshot;
};
