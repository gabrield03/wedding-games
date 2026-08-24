"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { StrandsPuzzle } from "@/domain/strands/types";

import { StrandsGrid } from "./StrandsGrid";
import { useStrandsGame } from "./useStrandsGame";

type StrandsGameBoardProps = {
  puzzle: StrandsPuzzle;
  nextPuzzleId: string;
};

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function StrandsGameBoard(props: StrandsGameBoardProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  if (!isHydrated) {
    return (
      <section className="w-full min-w-0" aria-labelledby="strands-heading">
        <h1 id="strands-heading" className="text-center text-3xl font-bold">
          Strands
        </h1>
        <p className="mt-6 text-center text-neutral-600" role="status">
          Loading puzzle...
        </p>
      </section>
    );
  }

  return <HydratedStrandsGameBoard {...props} />;
}

function HydratedStrandsGameBoard({
  puzzle,
  nextPuzzleId,
}: StrandsGameBoardProps) {
  const game = useStrandsGame(puzzle);

  return (
    <section className="w-full min-w-0" aria-labelledby="strands-heading">
      <h1 id="strands-heading" className="text-center text-3xl font-bold">
        Strands
      </h1>

      <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
        Theme: <span className="font-semibold">{puzzle.themeClue}</span>
      </p>

      <div
        className="mt-4 min-h-6 w-full min-w-0 text-center font-semibold"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game.gameStatus === "complete" ? (
          <p className="break-words">Puzzle complete!</p>
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
          hintedPath={game.hintedPath}
          foundWords={game.foundWords}
          disabled={!game.canInteract}
          onSelectTile={game.selectTile}
          onClearSelection={game.clearSelection}
        />
      </div>

      <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Found {game.foundWords.length} of {game.answerCount}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {game.gameStatus === "playing" && (
          <button
            type="button"
            onClick={game.showHint}
            disabled={!game.canHint}
            className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-900"
          >
            Hint
          </button>
        )}

        {game.gameStatus === "complete" && (
          <button
            type="button"
            onClick={game.playAgain}
            className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Play Again
          </button>
        )}

        <Link
          href={`/games/strands/${nextPuzzleId}`}
          className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 dark:hover:bg-neutral-900"
        >
          Next Puzzle
        </Link>
      </div>
    </section>
  );
}
