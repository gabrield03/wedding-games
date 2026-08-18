import { CONNECTIONS_GROUP_SIZE, type ConnectionsPuzzle } from "./types";

const MAX_MISTAKES = 4;

export type ConnectionsGameState = {
  solvedGroupIds: string[];
  incorrectGuesses: string[][];
};

export type GameStatus = "playing" | "won" | "lost";

export type InvalidGuessReason =
  | "wrong_tile_count"
  | "duplicate_tile"
  | "unknown_tile"
  | "solved_tile"
  | "game_over";

export type GuessResult =
  | {
      status: "invalid";
      reason: InvalidGuessReason;
    }
  | {
      status: "duplicate";
    }
  | {
      status: "incorrect";
      oneAway: boolean;
      tileIds: string[];
    }
  | {
      status: "correct";
      groupId: string;
    };

export function createInitialGameState(): ConnectionsGameState {
  return {
    solvedGroupIds: [],
    incorrectGuesses: [],
  };
}

export function getMistakesRemaining(state: ConnectionsGameState): number {
  return Math.max(0, MAX_MISTAKES - state.incorrectGuesses.length);
}

export function getGameStatus(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
): GameStatus {
  if (state.solvedGroupIds.length === puzzle.groups.length) {
    return "won";
  }

  if (state.incorrectGuesses.length >= MAX_MISTAKES) {
    return "lost";
  }

  return "playing";
}

export function getRemainingTiles(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
) {
  return puzzle.groups
    .filter((group) => !state.solvedGroupIds.includes(group.id))
    .flatMap((group) => group.tiles);
}

export function evaluateGuess(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
  tileIds: string[],
): GuessResult {
  const invalidReason = validateSubmittedGuess(puzzle, state, tileIds);

  if (invalidReason) {
    return {
      status: "invalid",
      reason: invalidReason,
    };
  }

  if (isDuplicateGuess(state, tileIds)) {
    return {
      status: "duplicate",
    };
  }

  const matchingGroup = findMatchingGroup(puzzle, state, tileIds);

  if (matchingGroup) {
    return {
      status: "correct",
      groupId: matchingGroup.id,
    };
  }

  return {
    status: "incorrect",
    oneAway: isOneAway(puzzle, state, tileIds),
    tileIds: normalizeGuess(tileIds),
  };
}

export function applyGuessResult(
  state: ConnectionsGameState,
  result: GuessResult,
): ConnectionsGameState {
  switch (result.status) {
    case "correct":
      return {
        ...state,
        solvedGroupIds: [...state.solvedGroupIds, result.groupId],
      };

    case "incorrect":
      return {
        ...state,
        incorrectGuesses: [...state.incorrectGuesses, result.tileIds],
      };

    case "invalid":
    case "duplicate":
      return state;
  }
}

function validateSubmittedGuess(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
  tileIds: string[],
): InvalidGuessReason | null {
  if (getGameStatus(puzzle, state) !== "playing") {
    return "game_over";
  }

  if (tileIds.length !== CONNECTIONS_GROUP_SIZE) {
    return "wrong_tile_count";
  }

  if (new Set(tileIds).size !== tileIds.length) {
    return "duplicate_tile";
  }

  const allTileIds = new Set(
    puzzle.groups.flatMap((group) => group.tiles.map((tile) => tile.id)),
  );

  if (tileIds.some((tileId) => !allTileIds.has(tileId))) {
    return "unknown_tile";
  }

  const solvedTileIds = new Set(
    puzzle.groups
      .filter((group) => state.solvedGroupIds.includes(group.id))
      .flatMap((group) => group.tiles.map((tile) => tile.id)),
  );

  if (tileIds.some((tileId) => solvedTileIds.has(tileId))) {
    return "solved_tile";
  }

  return null;
}

function isDuplicateGuess(
  state: ConnectionsGameState,
  tileIds: string[],
): boolean {
  const normalizedGuess = normalizeGuess(tileIds);

  return state.incorrectGuesses.some(
    (guess) => normalizeGuess(guess).join("|") === normalizedGuess.join("|"),
  );
}

function findMatchingGroup(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
  tileIds: string[],
) {
  return puzzle.groups.find((group) => {
    if (state.solvedGroupIds.includes(group.id)) {
      return false;
    }

    return (
      getOverlapCount(
        group.tiles.map((tile) => tile.id),
        tileIds,
      ) === CONNECTIONS_GROUP_SIZE
    );
  });
}

function isOneAway(
  puzzle: ConnectionsPuzzle,
  state: ConnectionsGameState,
  tileIds: string[],
): boolean {
  return puzzle.groups.some((group) => {
    if (state.solvedGroupIds.includes(group.id)) {
      return false;
    }

    return (
      getOverlapCount(
        group.tiles.map((tile) => tile.id),
        tileIds,
      ) ===
      CONNECTIONS_GROUP_SIZE - 1
    );
  });
}

function getOverlapCount(first: string[], second: string[]): number {
  const firstIds = new Set(first);

  return second.filter((id) => firstIds.has(id)).length;
}

function normalizeGuess(tileIds: string[]): string[] {
  return [...tileIds].sort();
}
