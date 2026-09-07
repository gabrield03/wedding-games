"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useRef,
  useSyncExternalStore,
} from "react";

import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";

import { MiniCrosswordGrid } from "./MiniCrosswordGrid";
import { useMiniCrosswordGame } from "./useMiniCrosswordGame";

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
  const textInputRef = useRef<HTMLInputElement>(null);
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

  function focusTextInput() {
    textInputRef.current?.focus({ preventScroll: true });
  }

  function handleTextInputChange(event: ChangeEvent<HTMLInputElement>) {
    const letter = event.currentTarget.value.slice(-1);
    event.currentTarget.value = "";

    if (/^[A-Za-z]$/.test(letter)) {
      game.enterLetter(letter);
    }
  }

  function handleTextInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    event.stopPropagation();

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
      <input
        ref={textInputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        tabIndex={-1}
        maxLength={1}
        aria-label="Mini Crossword keyboard input"
        className="pointer-events-none fixed bottom-0 left-0 h-4 w-4 text-base opacity-0"
        onChange={handleTextInputChange}
        onKeyDown={handleTextInputKeyDown}
      />

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
          onRequestTextInput={focusTextInput}
        />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <ClueList
          heading="Across"
          entries={acrossEntries}
          activeEntry={game.activeEntry}
          disabled={game.gameStatus === "complete"}
          onSelectEntry={game.selectEntry}
          onRequestTextInput={focusTextInput}
        />
        <ClueList
          heading="Down"
          entries={downEntries}
          activeEntry={game.activeEntry}
          disabled={game.gameStatus === "complete"}
          onSelectEntry={game.selectEntry}
          onRequestTextInput={focusTextInput}
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

type ClueListProps = {
  heading: "Across" | "Down";
  entries: MiniCrosswordPuzzle["entries"];
  activeEntry: MiniCrosswordPuzzle["entries"][number] | null;
  disabled: boolean;
  onSelectEntry: (entry: MiniCrosswordPuzzle["entries"][number]) => void;
  onRequestTextInput: () => void;
};

function ClueList({
  heading,
  entries,
  activeEntry,
  disabled,
  onSelectEntry,
  onRequestTextInput,
}: ClueListProps) {
  const pointerEntryRef = useRef<string | null>(null);

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
                onPointerDown={() => {
                  pointerEntryRef.current = `${entry.number}:${entry.direction}`;
                }}
                onPointerCancel={() => {
                  pointerEntryRef.current = null;
                }}
                onPointerLeave={() => {
                  pointerEntryRef.current = null;
                }}
                onClick={() => {
                  const entryKey = `${entry.number}:${entry.direction}`;
                  const pointerActivated = pointerEntryRef.current === entryKey;

                  onSelectEntry(entry);
                  pointerEntryRef.current = null;

                  if (pointerActivated) {
                    onRequestTextInput();
                  }
                }}
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
