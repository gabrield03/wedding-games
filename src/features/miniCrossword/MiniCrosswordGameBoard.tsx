"use client";

import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useSyncExternalStore,
} from "react";

import type {
  MiniCrosswordEntry,
  MiniCrosswordPuzzle,
} from "@/domain/miniCrossword/types";

import { MiniCrosswordGrid } from "./MiniCrosswordGrid";
import { useMiniCrosswordGame } from "./useMiniCrosswordGame";

const MINI_CROSSWORD_KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type MiniCrosswordGameBoardProps = {
  puzzle: MiniCrosswordPuzzle;
  nextPuzzleId: string;
};

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function MiniCrosswordGameBoard(props: MiniCrosswordGameBoardProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  if (!isHydrated) {
    return (
      <section
        className="mx-auto w-full max-w-2xl"
        aria-labelledby="mini-crossword-heading"
      >
        <h1
          id="mini-crossword-heading"
          className="text-center text-3xl font-bold"
        >
          Mini Crossword
        </h1>
        <p className="mt-6 text-center text-neutral-600" role="status">
          Loading puzzle...
        </p>
      </section>
    );
  }

  return <HydratedMiniCrosswordGameBoard {...props} />;
}

function HydratedMiniCrosswordGameBoard({
  puzzle,
  nextPuzzleId,
}: MiniCrosswordGameBoardProps) {
  const game = useMiniCrosswordGame(puzzle);
  const acrossEntries = puzzle.entries.filter(
    ({ direction }) => direction === "across",
  );
  const downEntries = puzzle.entries.filter(
    ({ direction }) => direction === "down",
  );
  const orderedEntries = [...puzzle.entries].sort(compareEntries);
  const activeEntryIndex = game.activeEntry
    ? orderedEntries.findIndex((entry) => entriesEqual(entry, game.activeEntry))
    : -1;

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

  function selectRelativeEntry(offset: number) {
    if (orderedEntries.length === 0) {
      return;
    }

    const currentIndex = activeEntryIndex >= 0 ? activeEntryIndex : 0;
    const nextIndex =
      (currentIndex + offset + orderedEntries.length) % orderedEntries.length;

    game.selectEntry(orderedEntries[nextIndex]!);
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
          <p className="hidden sm:block">
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

      {game.gameStatus === "playing" && game.activeEntry && (
        <div
          className="mt-4 flex items-stretch sm:hidden"
          role="group"
          aria-label="Mini Crossword clue navigation"
        >
          <button
            type="button"
            onClick={() => selectRelativeEntry(-1)}
            aria-label="Previous clue"
            className="min-h-14 w-12 shrink-0 rounded-l-lg border border-r-0 text-2xl font-semibold transition active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-inset dark:active:bg-neutral-900"
          >
            ‹
          </button>
          <div className="flex min-h-14 min-w-0 flex-1 items-center justify-center border px-3 py-2 text-center">
            <p className="break-words text-sm">
              <span className="font-bold">
                {game.activeEntry.number}{" "}
                {game.activeEntry.direction === "across" ? "Across" : "Down"}
              </span>{" "}
              {game.activeEntry.clue}
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectRelativeEntry(1)}
            aria-label="Next clue"
            className="min-h-14 w-12 shrink-0 rounded-r-lg border border-l-0 text-2xl font-semibold transition active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-inset dark:active:bg-neutral-900"
          >
            ›
          </button>
        </div>
      )}

      {game.gameStatus === "playing" && (
        <MiniCrosswordKeyboard
          onLetter={game.enterLetter}
          onBackspace={game.backspace}
        />
      )}

      <div className="mt-8 hidden gap-8 sm:grid sm:grid-cols-2">
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

      <div className="mt-8 flex flex-wrap justify-center gap-3">
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

        <Link
          href={`/games/mini-crossword/${nextPuzzleId}`}
          className="rounded-full border px-5 py-2 font-semibold transition hover:bg-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 dark:hover:bg-neutral-900"
        >
          Next Puzzle
        </Link>
      </div>
    </section>
  );
}

type MiniCrosswordKeyboardProps = {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
};

function MiniCrosswordKeyboard({
  onLetter,
  onBackspace,
}: MiniCrosswordKeyboardProps) {
  return (
    <div
      className="mt-3 space-y-1.5 sm:hidden"
      role="group"
      aria-label="Mini Crossword keyboard"
    >
      {MINI_CROSSWORD_KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={row}
          className={`flex justify-center gap-1 ${
            rowIndex === 1 ? "px-4" : rowIndex === 2 ? "px-7" : ""
          }`}
        >
          {[...row].map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onLetter(letter)}
              aria-label={letter}
              className="min-h-12 min-w-0 flex-1 touch-manipulation rounded border border-neutral-400 bg-neutral-100 px-0.5 text-sm font-bold text-neutral-950 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-1 dark:bg-neutral-200"
            >
              {letter}
            </button>
          ))}

          {rowIndex === MINI_CROSSWORD_KEYBOARD_ROWS.length - 1 && (
            <button
              type="button"
              onClick={onBackspace}
              aria-label="Backspace"
              className="min-h-12 min-w-0 flex-[1.5] touch-manipulation rounded border border-neutral-400 bg-neutral-200 px-1 text-xl font-bold text-neutral-950 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-1"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
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
                aria-label={`${entry.number}. ${entry.clue}`}
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

function compareEntries(first: MiniCrosswordEntry, second: MiniCrosswordEntry) {
  if (first.number !== second.number) {
    return first.number - second.number;
  }

  if (first.direction === second.direction) {
    return 0;
  }

  return first.direction === "across" ? -1 : 1;
}

function entriesEqual(
  first: MiniCrosswordEntry,
  second: MiniCrosswordEntry,
): boolean {
  return (
    first.number === second.number && first.direction === second.direction
  );
}
