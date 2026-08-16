"use client";

import { useState } from "react";

import type { ConnectionsPuzzle } from "@/domain/connections/types";

import { ConnectionTile } from "./ConnectionTile";

import {
  applyGuessResult,
  createInitialGameState,
  evaluateGuess,
  getGameStatus,
  getMistakesRemaining,
  getRemainingTiles,
} from "@/domain/connections/gameplay";

const MAX_SELECTED_TILES = 4;

type ConnectionsGameBoardProps = {
  puzzle: ConnectionsPuzzle;
};

type Feedback = "incorrect" | "one-away" | "duplicate" | "correct" | null;

export function ConnectionsGameBoard({ puzzle }: ConnectionsGameBoardProps) {
  const tiles = puzzle.groups.flatMap((group) => group.tiles);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [tileOrder, setTileOrder] = useState<string[]>(() =>
    seededShuffle(
      tiles.map((tile) => tile.id),
      puzzle.id,
    ),
  );
  const [gameState, setGameState] = useState(createInitialGameState);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctGuessTileIds, setCorrectGuessTileIds] = useState<string[]>([]);
  const [feedbackAttempt, setFeedbackAttempt] = useState(0);

  const isResolvingCorrectGuess = correctGuessTileIds.length > 0;

  function handleTileToggle(tileId: string) {
    if (isResolvingCorrectGuess) {
      return;
    }
    setFeedback(null);
    setSelectedTileIds((currentTileIds) => {
      if (currentTileIds.includes(tileId)) {
        return currentTileIds.filter((id) => id !== tileId);
      }

      if (currentTileIds.length >= MAX_SELECTED_TILES) {
        return currentTileIds;
      }

      return [...currentTileIds, tileId];
    });
  }

  function handleShuffle() {
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

  function handleSubmit() {
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

  function handleRestart() {
    setGameState(createInitialGameState());
    setSelectedTileIds([]);
    setFeedback(null);
    setTileOrder(shuffle(tiles.map((tile) => tile.id)));
    setFeedbackAttempt(0);
    setCorrectGuessTileIds([]);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <section>
        <h1 className="text-center text-3xl font-bold">{puzzle.title}</h1>

        <p className="mt-2 text-center text-neutral-600">
          Find groups of four related items.
        </p>

        <div aria-live="polite">
          {gameStatus === "won" && (
            <div className="mt-4 text-center">
              <p className="text-xl font-bold">Puzzle complete!</p>
            </div>
          )}

          {gameStatus === "lost" && (
            <div className="mt-4 text-center">
              <p className="text-xl font-bold">Game over</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <div
            className="mb-2 h-6 text-center font-semibold"
            aria-live="polite"
          >
            {feedback === "correct" && <p>Correct!</p>}
            {feedback === "one-away" && <p>One away!</p>}
            {feedback === "incorrect" && <p>Incorrect guess</p>}
            {feedback === "duplicate" && <p>Already guessed</p>}
          </div>

          <div className="space-y-2">
            {displayedGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-neutral-400 bg-neutral-400 p-2 text-neutral-950"
              >
                <p className="mb-2 text-center font-bold">{group.category}</p>

                <div className="grid grid-cols-4 gap-1 sm:gap-2">
                  {group.tiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="min-h-16 min-w-0 rounded-lg bg-neutral-300 px-1 py-3 text-center text-xs font-semibold break-words text-neutral-950 sm:min-h-20 sm:px-3 sm:py-4 sm:text-base"
                    >
                      {tile.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {gameStatus === "playing" && (
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {orderedTiles.map((tile) => {
                  const selected = selectedTileIds.includes(tile.id);
                  const shaking = selected && feedback !== null;
                  const correct = correctGuessTileIds.includes(tile.id);

                  return (
                    <ConnectionTile
                      key={`${tile.id}-${shaking ? feedbackAttempt : 0}`}
                      tile={tile}
                      selected={selected}
                      shaking={shaking}
                      correct={correct}
                      onToggle={handleTileToggle}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {gameStatus === "playing" && (
          <>
            <p className="mt-2 text-center">
              Mistakes remaining: {mistakesRemaining}
            </p>

            <p className="mt-6 text-center">
              {selectedTileIds.length} / {MAX_SELECTED_TILES} selected
            </p>
          </>
        )}

        <div className="mt-4 flex justify-center gap-3">
          {gameStatus === "playing" ? (
            <>
              <button
                type="button"
                onClick={handleShuffle}
                className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
              >
                Shuffle
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  selectedTileIds.length !== MAX_SELECTED_TILES ||
                  isResolvingCorrectGuess
                }
                className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                Submit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRestart}
              className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
            >
              Play Again
            </button>
          )}
        </div>
      </section>
    </main>
  );
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
