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

type Feedback = "incorrect" | "one-away" | "duplicate" | null;

export function ConnectionsGameBoard({ puzzle }: ConnectionsGameBoardProps) {
  const tiles = puzzle.groups.flatMap((group) => group.tiles);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [tileOrder, setTileOrder] = useState<string[]>(
    tiles.map((tile) => tile.id),
  );
  const [gameState, setGameState] = useState(createInitialGameState);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleTileToggle(tileId: string) {
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
      return;
    }

    const nextState = applyGuessResult(gameState, result);
    const nextGameStatus = getGameStatus(puzzle, nextState);

    setGameState(nextState);

    if (nextGameStatus !== "playing") {
      setSelectedTileIds([]);
      setFeedback(null);
      return;
    }

    if (result.status === "correct") {
      setSelectedTileIds([]);
      setFeedback(null);
      return;
    }

    setFeedback(result.oneAway ? "one-away" : "incorrect");
  }

  function handleRestart() {
    setGameState(createInitialGameState());
    setSelectedTileIds([]);
    setFeedback(null);
    setTileOrder(shuffle(tiles.map((tile) => tile.id)));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <section>
        <h1 className="text-center text-3xl font-bold">{puzzle.title}</h1>

        <p className="mt-2 text-center text-neutral-600">
          Find groups of four related items.
        </p>

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

        <div className="mt-8">
          {feedback && (
            <div className="mb-2 text-center font-semibold">
              {feedback === "one-away" && <p>One away!</p>}
              {feedback === "incorrect" && <p>Incorrect guess</p>}
              {feedback === "duplicate" && <p>Already guessed</p>}
            </div>
          )}

          <div className="space-y-2">
            {displayedGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-neutral-400 bg-neutral-400 p-2 text-neutral-950"
              >
                <p className="mb-2 text-center font-bold">{group.category}</p>

                <div className="grid grid-cols-4 gap-2">
                  {group.tiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="min-h-20 rounded-lg bg-neutral-300 px-3 py-4 text-center font-semibold text-neutral-950"
                    >
                      {tile.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {gameStatus === "playing" && (
              <div className="grid grid-cols-4 gap-2">
                {orderedTiles.map((tile) => {
                  const selected = selectedTileIds.includes(tile.id);

                  return (
                    <ConnectionTile
                      key={tile.id}
                      tile={tile}
                      selected={selected}
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
                className="cursor-pointer rounded-full border px-5 py-2 font-semibold"
              >
                Shuffle
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedTileIds.length !== MAX_SELECTED_TILES}
                className="rounded-full border px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRestart}
              className="cursor-pointer rounded-full border px-5 py-2 font-semibold"
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
