"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";

import { MiniCrosswordGrid } from "./MiniCrosswordGrid";
import { useMiniCrosswordGame } from "./useMiniCrosswordGame";

type MiniCrosswordGameBoardProps = {
  puzzle: MiniCrosswordPuzzle;
};

export function MiniCrosswordGameBoard({
  puzzle,
}: MiniCrosswordGameBoardProps) {
  const game = useMiniCrosswordGame(puzzle);
  const acrossEntries = puzzle.entries.filter(
    ({ direction }) => direction === "across",
  );
  const downEntries = puzzle.entries.filter(
    ({ direction }) => direction === "down",
  );

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (game.gameStatus === "complete") {
      return;
    }

    if (/^[A-Za-z]$/.test(event.key)) {
      event.preventDefault();
      game.enterLetter(event.key);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      game.backspace();
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-2xl"
      aria-labelledby="mini-crossword-heading"
      onKeyDown={handleKeyDown}
    >
      <h1
        id="mini-crossword-heading"
        className="text-center text-3xl font-bold"
      >
        Mini Crossword
      </h1>

      <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
        {puzzle.title}
      </p>

      <div
        className="mt-4 min-h-6 text-center font-semibold"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game.gameStatus === "complete" ? (
          <p>Puzzle complete!</p>
        ) : game.feedback === "incorrect" ? (
          <p>Something&apos;s not right.</p>
        ) : game.activeEntry ? (
          <p>
            {game.activeEntry.number}{" "}
            {game.activeEntry.direction === "across" ? "Across" : "Down"}:{" "}
            <span className="font-normal">{game.activeEntry.clue}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <MiniCrosswordGrid
          puzzle={puzzle}
          letters={game.letters}
          selectedCell={game.selectedCell}
          activeEntry={game.activeEntry}
          disabled={game.gameStatus === "complete"}
          onSelectCell={game.selectCell}
        />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <ClueList
          heading="Across"
          entries={acrossEntries}
          activeEntry={game.activeEntry}
          disabled={game.gameStatus === "complete"}
          onSelectEntry={game.selectEntry}
        />
        <ClueList
          heading="Down"
          entries={downEntries}
          activeEntry={game.activeEntry}
          disabled={game.gameStatus === "complete"}
          onSelectEntry={game.selectEntry}
        />
      </div>

      <div className="mt-8 text-center">
        {game.gameStatus === "complete" ? (
          <button
            type="button"
            onClick={game.playAgain}
            className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Play Again
          </button>
        ) : (
          <button
            type="button"
            onClick={game.submit}
            disabled={!game.canSubmit}
            className="rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </div>
    </section>
  );
}

type ClueListProps = {
  heading: "Across" | "Down";
  entries: MiniCrosswordPuzzle["entries"];
  activeEntry: MiniCrosswordPuzzle["entries"][number] | null;
  disabled: boolean;
  onSelectEntry: (entry: MiniCrosswordPuzzle["entries"][number]) => void;
};

function ClueList({
  heading,
  entries,
  activeEntry,
  disabled,
  onSelectEntry,
}: ClueListProps) {
  return (
    <section aria-labelledby={`mini-crossword-${heading.toLowerCase()}`}>
      <h2
        id={`mini-crossword-${heading.toLowerCase()}`}
        className="text-xl font-bold"
      >
        {heading}
      </h2>
      <ol className="mt-3 space-y-1">
        {entries.map((entry) => {
          const active =
            activeEntry?.number === entry.number &&
            activeEntry.direction === entry.direction;

          return (
            <li key={`${entry.number}-${entry.direction}`}>
              <button
                type="button"
                onClick={() => onSelectEntry(entry)}
                disabled={disabled}
                aria-current={active ? "true" : undefined}
                className={`w-full rounded-md px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 ${
                  active
                    ? "bg-sky-100 dark:bg-sky-900"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                } disabled:cursor-default`}
              >
                <span className="mr-2 font-bold">{entry.number}.</span>
                {entry.clue}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
