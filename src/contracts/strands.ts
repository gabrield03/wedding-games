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

export type RevealedStrandsAnswer =
  | {
      word: string;
      kind: "theme";
      path: StrandsPath;
      themeIndex: number;
    }
  | {
      word: string;
      kind: "spangram";
      path: StrandsPath;
    };

export type StrandsAttemptSnapshot = {
  attemptId: string;
  version: number;
  puzzle: PublicStrandsPuzzle;
  foundAnswers: RevealedStrandsAnswer[];
  hintedTileIndexes: number[] | null;
  gameStatus: StrandsGameStatus;
};

export type StartStrandsAttemptRequest = {
  puzzleId: string;
};

export type SubmitStrandsPathRequest = {
  path: StrandsPath;
  version: number;
};

export type RequestStrandsHintRequest = {
  version: number;
};

export type StrandsPathOutcome =
  | "found_theme"
  | "found_spangram"
  | "already_found"
  | "not_theme"
  | "invalid_path"
  | "game_complete";

export type StrandsAttemptResponse = {
  attempt: StrandsAttemptSnapshot;
};

export type StrandsPathResponse = {
  outcome: StrandsPathOutcome;
  attempt: StrandsAttemptSnapshot;
};

export type StrandsHintResponse = {
  attempt: StrandsAttemptSnapshot;
};

export type StrandsGameplayErrorCode =
  | "authenticated_player_required"
  | "player_not_ready"
  | "strands_resource_not_found"
  | "invalid_request"
  | "stale_attempt"
  | "invalid_action"
  | "strands_gameplay_unavailable";

export type StrandsGameplayErrorResponse = {
  error: StrandsGameplayErrorCode;
  attempt?: StrandsAttemptSnapshot;
};
