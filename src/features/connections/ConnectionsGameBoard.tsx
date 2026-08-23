"use client";

import type {
  ConnectionsGroupTier,
  ConnectionsPuzzlePreview,
} from "@/contracts/connections";

import { ConnectionsReaction } from "./ConnectionsReaction";
import { ConnectionTile } from "./ConnectionTile";
import { useConnectionsGame } from "./useConnectionsGame";

type ConnectionsGameBoardProps = {
  puzzle: ConnectionsPuzzlePreview;
};

const GROUP_TIER_CLASSES: Record<ConnectionsGroupTier, string> = {
  yellow: "bg-yellow-300",
  green: "bg-lime-500",
  blue: "bg-blue-300",
  purple: "bg-purple-400",
};

export function ConnectionsGameBoard({ puzzle }: ConnectionsGameBoardProps) {
  const game = useConnectionsGame(puzzle);

  return (
    <section
      className="relative isolate"
      aria-busy={game.initializationStatus === "preparing"}
    >
      <h1 className="text-center text-3xl font-bold">Connections</h1>

      <p className="mt-2 text-center text-neutral-600">
        Find groups of four related items.
      </p>

      {game.initializationStatus === "preparing" && (
        <p className="mt-8 text-center" role="status" aria-live="polite">
          Preparing your game…
        </p>
      )}

      {game.initializationStatus === "error" && (
        <div className="mt-8 text-center" role="alert">
          <p>{game.initializationError}</p>
          <button
            type="button"
            onClick={game.retryInitialization}
            className="mt-4 cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {game.initializationStatus === "ready" && (
        <>
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
            <div
              className="mb-2 min-h-6 text-center font-semibold"
              aria-live="polite"
              aria-atomic="true"
            >
              {game.feedback === "correct" && <p>Correct!</p>}
              {game.feedback === "one-away" && <p>One away!</p>}
              {game.feedback === "incorrect" && <p>Incorrect guess</p>}
              {game.feedback === "duplicate" && <p>Already guessed</p>}
              {game.feedback === "updated" && (
                <p>
                  Your game was updated. Review your selection and try again.
                </p>
              )}
              {game.feedback === "action-unavailable" && (
                <p>That action is no longer available.</p>
              )}
              {game.requestError && <p>{game.requestError}</p>}
            </div>

            <div
              className="grid grid-cols-4 gap-1 sm:gap-2"
              data-connections-board
            >
              {game.displayedGroups.map((group) => {
                const groupState =
                  game.gameStatus === "lost" ? "Revealed" : "Solved";

                return (
                  <div
                    key={group.category}
                    role="group"
                    aria-label={`${groupState} group: ${group.category}`}
                    data-connections-solved-group
                    data-connections-group-tier={group.tier}
                    className={`col-span-4 flex h-16 min-w-0 flex-col items-center justify-center rounded-lg px-2 py-1 text-center text-neutral-950 sm:h-20 sm:px-4 ${GROUP_TIER_CLASSES[group.tier]}`}
                  >
                    <p className="w-full truncate text-xs font-bold sm:text-base">
                      {group.category}
                    </p>
                    <p className="mt-0.5 w-full text-[10px] leading-tight break-words sm:text-sm">
                      {group.tiles.map((tile) => tile.label).join(", ")}
                    </p>
                  </div>
                );
              })}

              {game.gameStatus === "playing" &&
                game.orderedTiles.map((tile) => {
                  const selected = game.selectedTileIds.includes(tile.id);
                  const shaking =
                    selected &&
                    (game.feedback === "incorrect" ||
                      game.feedback === "one-away" ||
                      game.feedback === "duplicate");
                  const correct = game.correctGuessTileIds.includes(tile.id);

                  return (
                    <ConnectionTile
                      key={`${tile.id}-${shaking ? game.feedbackAttempt : 0}`}
                      tile={tile}
                      selected={selected}
                      shaking={shaking}
                      correct={correct}
                      disabled={!game.canInteract}
                      onToggle={game.toggleTile}
                    />
                  );
                })}
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
                  disabled={!game.canInteract}
                  className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  Shuffle
                </button>

                <button
                  type="button"
                  onClick={game.submitGuess}
                  disabled={!game.canSubmit}
                  className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  {game.isSubmitting ? "Submitting…" : "Submit"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={game.playAgain}
                disabled={!game.canReplay}
                className="cursor-pointer rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                {game.isReplaying ? "Starting…" : "Play Again"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
