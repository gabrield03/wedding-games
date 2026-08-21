"use client";

import type { ConnectionsPuzzle } from "@/domain/connections/types";

import { ConnectionsReaction } from "./ConnectionsReaction";
import { ConnectionTile } from "./ConnectionTile";
import { useConnectionsGame } from "./useConnectionsGame";

type ConnectionsGameBoardProps = {
  puzzle: ConnectionsPuzzle;
};

export function ConnectionsGameBoard({ puzzle }: ConnectionsGameBoardProps) {
  const game = useConnectionsGame(puzzle);

  return (
    <section className="relative isolate">
      <h1 className="text-center text-3xl font-bold">{puzzle.title}</h1>

      <p className="mt-2 text-center text-neutral-600">
        Find groups of four related items.
      </p>

      <div aria-live="polite">
        {game.gameStatus === "won" && (
          <div className="mt-4 text-center">
            <p className="text-xl font-bold">Puzzle complete!</p>
          </div>
        )}

        {game.gameStatus === "lost" && (
          <div className="mt-4 text-center">
            <p className="text-xl font-bold">Game over</p>
          </div>
        )}
      </div>

      {game.reaction && (
        <ConnectionsReaction
          key={game.reaction.occurrence}
          reaction={game.reaction}
        />
      )}

      <div className="mt-8">
        <div className="mb-2 h-6 text-center font-semibold" aria-live="polite">
          {game.feedback === "correct" && <p>Correct!</p>}
          {game.feedback === "one-away" && <p>One away!</p>}
          {game.feedback === "incorrect" && <p>Incorrect guess</p>}
          {game.feedback === "duplicate" && <p>Already guessed</p>}
        </div>

        <div className="space-y-2">
          {game.displayedGroups.map((group) => (
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

          {game.gameStatus === "playing" && (
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {game.orderedTiles.map((tile) => {
                const selected = game.selectedTileIds.includes(tile.id);
                const shaking = selected && game.feedback !== null;
                const correct = game.correctGuessTileIds.includes(tile.id);

                return (
                  <ConnectionTile
                    key={`${tile.id}-${shaking ? game.feedbackAttempt : 0}`}
                    tile={tile}
                    selected={selected}
                    shaking={shaking}
                    correct={correct}
                    onToggle={game.toggleTile}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {game.gameStatus === "playing" && (
        <>
          <p className="mt-2 text-center">
            Mistakes remaining: {game.mistakesRemaining}
          </p>

          <p className="mt-6 text-center">
            {game.selectedTileIds.length} / {game.selectionLimit} selected
          </p>
        </>
      )}

      <div className="mt-4 flex justify-center gap-3">
        {game.gameStatus === "playing" ? (
          <>
            <button
              type="button"
              onClick={game.shuffleTiles}
              className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
            >
              Shuffle
            </button>

            <button
              type="button"
              onClick={game.submitGuess}
              disabled={!game.canSubmit}
              className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              Submit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={game.restart}
            className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Play Again
          </button>
        )}
      </div>
    </section>
  );
}
