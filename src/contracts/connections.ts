export type ConnectionsPuzzlePreview = {
  id: string;
  title: string;
};

export type PublicConnectionsTile = {
  id: string;
  label: string;
};

export type ConnectionsGroupTier = "yellow" | "green" | "blue" | "purple";

export type RevealedConnectionsGroup = {
  category: string;
  tier: ConnectionsGroupTier;
  tiles: PublicConnectionsTile[];
};

export type ConnectionsAttemptSnapshot = {
  attemptId: string;
  version: number;
  remainingTiles: PublicConnectionsTile[];
  displayedGroups: RevealedConnectionsGroup[];
  mistakesRemaining: number;
  gameStatus: "playing" | "won" | "lost";
};

export type ConnectionsGuessOutcome =
  "correct" | "incorrect" | "one_away" | "duplicate";

export type StartConnectionsAttemptRequest = {
  puzzleId: string;
  replayFromAttemptId?: string;
};

export type SubmitConnectionsGuessRequest = {
  tileIds: string[];
  version: number;
};

export type ConnectionsAttemptResponse = {
  attempt: ConnectionsAttemptSnapshot;
};

export type ConnectionsGuessResponse = {
  outcome: ConnectionsGuessOutcome;
  attempt: ConnectionsAttemptSnapshot;
};

export type ConnectionsGameplayErrorCode =
  | "authenticated_player_required"
  | "player_not_ready"
  | "connections_resource_not_found"
  | "invalid_request"
  | "stale_attempt"
  | "invalid_action"
  | "attempt_not_complete"
  | "connections_gameplay_unavailable";

export type ConnectionsGameplayErrorResponse = {
  error: ConnectionsGameplayErrorCode;
  attempt?: ConnectionsAttemptSnapshot;
};
