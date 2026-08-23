"use client";

import type { StrandsPuzzle } from "@/domain/strands/types";

import { StrandsGrid } from "./StrandsGrid";
import { useStrandsGame } from "./useStrandsGame";

type StrandsGameBoardProps = {
  puzzle: StrandsPuzzle;
};

export function StrandsGameBoard({ puzzle }: StrandsGameBoardProps) {
  const game = useStrandsGame(puzzle);

  return (
    <section aria-labelledby="strands-heading">
      <h1 id="strands-heading" className="text-center text-3xl font-bold">
        Strands
      </h1>

      <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
        Theme: <span className="font-semibold">{puzzle.themeClue}</span>
      </p>

      <div
        className="mt-4 min-h-6 text-center font-semibold"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game.gameStatus === "complete" ? (
          <p>Puzzle complete!</p>
        ) : game.feedback ? (
          <p>{game.feedback.message}</p>
        ) : game.selectedWord ? (
          <p>{game.selectedWord}</p>
        ) : (
          <p className="font-normal text-neutral-500">Select adjacent letters.</p>
        )}
      </div>

      <div className="mt-6">
        <StrandsGrid
          puzzle={puzzle}
          selectedPath={game.selectedPath}
          claimedTileIndexes={game.claimedTileIndexes}
          disabled={!game.canInteract}
          onSelectTile={game.selectTile}
        />
      </div>

      <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Found {game.foundWords.length} of {game.answerCount}
      </p>

      <div className="mt-4 flex justify-center gap-3">
        {game.gameStatus === "playing" ? (
          <>
            <button
              type="button"
              onClick={game.clearSelection}
              disabled={game.selectedPath.length === 0}
              className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={game.submitSelection}
              disabled={!game.canSubmit}
              className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              Submit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={game.playAgain}
            className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Play Again
          </button>
        )}
      </div>
    </section>
  );
}
