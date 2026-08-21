import { useEffect, useRef, useState } from "react";

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

import {
  selectConnectionsReactionPhoto,
  type ConnectionsReaction,
  type ConnectionsReactionKind,
} from "./connectionsReactions";

const INTERMEDIATE_REACTION_DURATION_MS = 900;

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
  const [reaction, setReaction] = useState<ConnectionsReaction | null>(null);
  const reactionOccurrence = useRef(0);
  const reactionTimer = useRef<number | null>(null);
  const correctResolutionTimer = useRef<number | null>(null);
  const previousReactionPhotos = useRef<
    Partial<Record<ConnectionsReactionKind, string>>
  >({});

  useEffect(() => {
    return () => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
      }

      if (correctResolutionTimer.current !== null) {
        window.clearTimeout(correctResolutionTimer.current);
      }
    };
  }, []);

  const isResolvingCorrectGuess = correctGuessTileIds.length > 0;

  function toggleTile(tileId: string) {
    if (isResolvingCorrectGuess) {
      return;
    }

    clearReaction();
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
      clearReaction();
      setFeedback("duplicate");
      setFeedbackAttempt((current) => current + 1);
      return;
    }

    const nextState = applyGuessResult(gameState, result);
    const nextGameStatus = getGameStatus(puzzle, nextState);

    if (result.status === "correct") {
      clearReaction();
      setFeedback("correct");
      setCorrectGuessTileIds([...selectedTileIds]);

      if (nextGameStatus === "playing") {
        showReaction("correct");
      }

      correctResolutionTimer.current = window.setTimeout(() => {
        setGameState(nextState);
        setSelectedTileIds([]);
        setCorrectGuessTileIds([]);
        setFeedback(null);
        correctResolutionTimer.current = null;

        if (nextGameStatus === "won") {
          showReaction("win", true);
        }
      }, 300);

      return;
    }

    setGameState(nextState);

    if (nextGameStatus !== "playing") {
      setSelectedTileIds([]);
      setFeedback(null);
      showReaction("loss", true);
      return;
    }

    setFeedback(result.oneAway ? "one-away" : "incorrect");
    setFeedbackAttempt((current) => current + 1);
    showReaction("incorrect");
  }

  function restart() {
    clearReaction();
    setGameState(createInitialGameState());
    setSelectedTileIds([]);
    setFeedback(null);
    setTileOrder(shuffle(tiles.map((tile) => tile.id)));
    setFeedbackAttempt(0);
    setCorrectGuessTileIds([]);
  }

  function clearReaction() {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = null;
    }

    setReaction(null);
  }

  function showReaction(kind: ConnectionsReactionKind, persistent = false) {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = null;
    }

    reactionOccurrence.current += 1;

    const src = selectConnectionsReactionPhoto(
      kind,
      previousReactionPhotos.current[kind] ?? null,
    );

    previousReactionPhotos.current[kind] = src;

    const nextReaction = {
      occurrence: reactionOccurrence.current,
      kind,
      src,
    };

    setReaction(nextReaction);

    if (!persistent) {
      reactionTimer.current = window.setTimeout(() => {
        setReaction((currentReaction) =>
          currentReaction?.occurrence === nextReaction.occurrence
            ? null
            : currentReaction,
        );
        reactionTimer.current = null;
      }, INTERMEDIATE_REACTION_DURATION_MS);
    }
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
    reaction,
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
