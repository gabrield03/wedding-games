import { useState } from "react";

import {
  applyGuessResult,
  createInitialGameState,
  evaluateGuess,
  getGameStatus,
  getMistakesRemaining,
  getRemainingTiles,
} from "@/domain/connections/gameplay";
import {
  CONNECTIONS_GROUP_SIZE,
  type ConnectionsPuzzle,
} from "@/domain/connections/types";

export type ConnectionsFeedback =
  "incorrect" | "one-away" | "duplicate" | "correct" | null;

export function useConnectionsGame(puzzle: ConnectionsPuzzle) {
  const tiles = puzzle.groups.flatMap((group) => group.tiles);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [tileOrder, setTileOrder] = useState<string[]>(() =>
    seededShuffle(
      tiles.map((tile) => tile.id),
      puzzle.id,
    ),
  );
  const [gameState, setGameState] = useState(createInitialGameState);
  const [feedback, setFeedback] = useState<ConnectionsFeedback>(null);
  const [correctGuessTileIds, setCorrectGuessTileIds] = useState<string[]>([]);
  const [feedbackAttempt, setFeedbackAttempt] = useState(0);

  const isResolvingCorrectGuess = correctGuessTileIds.length > 0;

  function toggleTile(tileId: string) {
    if (isResolvingCorrectGuess) {
      return;
    }

    setFeedback(null);
    setSelectedTileIds((currentTileIds) => {
      if (currentTileIds.includes(tileId)) {
        return currentTileIds.filter((id) => id !== tileId);
      }

      if (currentTileIds.length >= CONNECTIONS_GROUP_SIZE) {
        return currentTileIds;
      }

      return [...currentTileIds, tileId];
    });
  }

  function shuffleTiles() {
    if (isResolvingCorrectGuess) {
      return;
    }

    setTileOrder((currentOrder) => shuffle(currentOrder));
  }

  const remainingTiles = getRemainingTiles(puzzle, gameState);
  const remainingTileIds = new Set(remainingTiles.map((tile) => tile.id));

  const orderedTiles = tileOrder
    .filter((tileId) => remainingTileIds.has(tileId))
    .map((tileId) => {
      const tile = remainingTiles.find((candidate) => candidate.id === tileId);

      if (!tile) {
        throw new Error(`Tile not found: ${tileId}`);
      }

      return tile;
    });

  const mistakesRemaining = getMistakesRemaining(gameState);
  const gameStatus = getGameStatus(puzzle, gameState);

  const solvedGroups = puzzle.groups.filter((group) =>
    gameState.solvedGroupIds.includes(group.id),
  );

  const unsolvedGroups = puzzle.groups.filter(
    (group) => !gameState.solvedGroupIds.includes(group.id),
  );

  const displayedGroups =
    gameStatus === "lost" ? [...solvedGroups, ...unsolvedGroups] : solvedGroups;

  const canSubmit =
    selectedTileIds.length === CONNECTIONS_GROUP_SIZE &&
    !isResolvingCorrectGuess;

  function submitGuess() {
    const result = evaluateGuess(puzzle, gameState, selectedTileIds);

    if (result.status === "invalid") {
      return;
    }

    if (result.status === "duplicate") {
      setFeedback("duplicate");
      setFeedbackAttempt((current) => current + 1);
      return;
    }

    const nextState = applyGuessResult(gameState, result);
    const nextGameStatus = getGameStatus(puzzle, nextState);

    if (result.status === "correct") {
      setFeedback("correct");
      setCorrectGuessTileIds([...selectedTileIds]);

      window.setTimeout(() => {
        setGameState(nextState);
        setSelectedTileIds([]);
        setCorrectGuessTileIds([]);
        setFeedback(null);
      }, 300);

      return;
    }

    setGameState(nextState);

    if (nextGameStatus !== "playing") {
      setSelectedTileIds([]);
      setFeedback(null);
      return;
    }

    setFeedback(result.oneAway ? "one-away" : "incorrect");
    setFeedbackAttempt((current) => current + 1);
  }

  function restart() {
    setGameState(createInitialGameState());
    setSelectedTileIds([]);
    setFeedback(null);
    setTileOrder(shuffle(tiles.map((tile) => tile.id)));
    setFeedbackAttempt(0);
    setCorrectGuessTileIds([]);
  }

  return {
    selectedTileIds,
    orderedTiles,
    displayedGroups,
    gameStatus,
    mistakesRemaining,
    feedback,
    correctGuessTileIds,
    feedbackAttempt,
    selectionLimit: CONNECTIONS_GROUP_SIZE,
    canSubmit,
    toggleTile,
    shuffleTiles,
    submitGuess,
    restart,
  };
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  let state = hashString(seed);

  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state * 1664525 + 1013904223) >>> 0;

    const randomIndex = state % (index + 1);

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
