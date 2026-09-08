import type { StrandsGameStatus, StrandsPath } from "@/domain/strands/types";

export type PublicStrandsPuzzle = {
  id: string;
  themeClue: string;
  grid: {
    rows: number;
    columns: number;
    letters: string;
  };
  answerCount: number;
};

export type RevealedStrandsAnswer = {
  word: string;
  kind: "theme" | "spangram";
  path: StrandsPath;
};

export type StrandsAttemptSnapshot = {
  attemptId: string;
  version: number;
  puzzle: PublicStrandsPuzzle;
  foundAnswers: RevealedStrandsAnswer[];
  gameStatus: StrandsGameStatus;
};

export type StartStrandsAttemptRequest = {
  puzzleId: string;
};

export type StrandsAttemptResponse = {
  attempt: StrandsAttemptSnapshot;
};

export type StrandsGameplayErrorCode =
  | "authenticated_player_required"
  | "player_not_ready"
  | "strands_resource_not_found"
  | "invalid_request"
  | "strands_gameplay_unavailable";

export type StrandsGameplayErrorResponse = {
  error: StrandsGameplayErrorCode;
};
