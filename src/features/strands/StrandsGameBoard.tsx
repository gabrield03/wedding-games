"use client";

import Link from "next/link";

import type { PublicStrandsPuzzle } from "@/contracts/strands";

import { StrandsGrid } from "./StrandsGrid";
import { useStrandsGame } from "./useStrandsGame";

type StrandsGameBoardProps = {
  puzzle: PublicStrandsPuzzle;
  nextPuzzleId: string;
};

export function StrandsGameBoard({
  puzzle,
  nextPuzzleId,
}: StrandsGameBoardProps) {
  const game = useStrandsGame(puzzle);

  return (
    <section
      className="w-full min-w-0"
      aria-labelledby="strands-heading"
      aria-busy={game.initializationStatus === "preparing"}
    >
      <h1 id="strands-heading" className="text-center text-3xl font-bold">
        Strands
      </h1>

      <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
        Theme: <span className="font-semibold">{puzzle.themeClue}</span>
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
          <div
            className="mt-4 min-h-6 w-full min-w-0 text-center font-semibold"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {game.gameStatus === "complete" ? (
              <p className="break-words">Puzzle complete!</p>
            ) : game.requestError ? (
              <p className="break-words">{game.requestError}</p>
            ) : game.feedback ? (
              <p className="break-words">{game.feedback.message}</p>
            ) : game.selectedWord ? (
              <p className="break-words">
                <span className="sr-only">Selected word: </span>
                {game.selectedWord}
              </p>
            ) : (
              <p className="font-normal text-neutral-500">
                Select adjacent letters.
              </p>
            )}
          </div>

          <div className="mt-6 w-full min-w-0">
            <StrandsGrid
              puzzle={puzzle}
              selectedPath={game.selectedPath}
              hintedTileIndexes={game.hintedTileIndexes}
              foundAnswers={game.foundAnswers}
              disabled={!game.canInteract}
              onSelectTile={game.selectTile}
              onSubmitSelection={() => void game.submitSelection()}
              onClearSelection={game.clearSelection}
            />
          </div>

          <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Found {game.foundWords.length} of {game.answerCount}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {game.gameStatus === "playing" && (
              <>
                <button
                  type="button"
                  onClick={() => void game.showHint()}
                  disabled={!game.canHint}
                  className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-900"
                >
                  {game.isRequestingHint ? "Loading Hint…" : "Hint"}
                </button>

                <button
                  type="button"
                  onClick={() => void game.submitSelection()}
                  disabled={!game.canSubmit}
                  className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-900"
                >
                  {game.isSubmitting ? "Submitting…" : "Submit"}
                </button>
              </>
            )}

            {game.gameStatus === "complete" && (
              <button
                type="button"
                onClick={() => void game.playAgain()}
                disabled={!game.canReplay}
                className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {game.isReplaying ? "Starting…" : "Play Again"}
              </button>
            )}

            <Link
              href={`/games/strands/${nextPuzzleId}`}
              className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 dark:hover:bg-neutral-900"
            >
              Next Puzzle
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
