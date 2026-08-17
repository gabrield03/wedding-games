"use client";

import Link from "next/link";

import { WORDLE_MAX_ATTEMPTS } from "@/domain/wordle/gameplay";
import {
  WORDLE_WORD_LENGTH,
  type WordleLetterStatus,
  type WordlePuzzle,
} from "@/domain/wordle/types";

import { WordleKeyboard } from "./WordleKeyboard";
import { useWordleGame } from "./useWordleGame";

type WordleGameBoardProps = {
  puzzle: WordlePuzzle;
  nextWordHref: string;
};

type DisplayTile = {
  letter: string;
  status: WordleLetterStatus | null;
};

export function WordleGameBoard({
  puzzle,
  nextWordHref,
}: WordleGameBoardProps) {
  const game = useWordleGame(puzzle);
  const activeRowIndex = game.submittedGuesses.length;
  const newestSubmittedRowIndex = game.submittedGuesses.length - 1;
  const rows = Array.from({ length: WORDLE_MAX_ATTEMPTS }, (_, rowIndex) => {
    const submittedGuess = game.submittedGuesses[rowIndex];

    if (submittedGuess) {
      return submittedGuess.evaluation.map(({ letter, status }) => ({
        letter,
        status,
      }));
    }

    if (rowIndex === game.submittedGuesses.length) {
      return createUnevaluatedRow(game.currentGuess);
    }

    return createUnevaluatedRow("");
  });

  return (
    <section aria-labelledby="wordle-heading">
      <h1 id="wordle-heading" className="text-center text-3xl font-bold">
        Wordle
      </h1>

      <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
        Guess the five-letter word in six attempts.
      </p>

      <div
        className="mt-4 min-h-6 text-center font-semibold"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game.gameStatus === "won" && <p>You got it!</p>}
        {game.gameStatus === "lost" && (
          <p>Game over. The answer was {puzzle.answer.toUpperCase()}.</p>
        )}
        {game.gameStatus === "playing" && game.feedback === "incomplete" && (
          <p>Not enough letters</p>
        )}
      </div>

      <div
        className="mx-auto mt-4 w-full max-w-sm space-y-1.5"
        role="group"
        aria-label="Wordle board"
      >
        {rows.map((row, rowIndex) => {
          const isActiveRow = rowIndex === activeRowIndex;
          const isNewestSubmittedRow = rowIndex === newestSubmittedRowIndex;
          const shouldShake = isActiveRow && game.feedback === "incomplete";

          return (
            <div
              key={
                isActiveRow
                  ? `active-${rowIndex}-${game.incompleteAttempt}`
                  : `row-${rowIndex}`
              }
              className={`grid grid-cols-5 gap-1.5 ${shouldShake ? "wordle-row-shake" : ""}`}
              role="group"
              aria-label={getRowLabel(
                row,
                rowIndex,
                game.submittedGuesses.length,
              )}
              data-wordle-row
            >
              {row.map((tile, tileIndex) => (
                <div
                  key={tileIndex}
                  aria-hidden="true"
                  data-wordle-tile
                  data-status={tile.status ?? "unsubmitted"}
                  className={`flex aspect-square items-center justify-center border-2 text-2xl font-bold sm:text-3xl ${getTileStatusClass(tile)} ${isNewestSubmittedRow ? "wordle-tile-reveal" : ""}`}
                  style={
                    isNewestSubmittedRow
                      ? { animationDelay: `${tileIndex * 50}ms` }
                      : undefined
                  }
                >
                  {tile.letter}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <WordleKeyboard
        statuses={game.keyboardStatuses}
        disabled={game.gameStatus !== "playing"}
        onLetter={game.addLetter}
        onBackspace={game.backspace}
        onEnter={game.submitGuess}
      />

      {game.gameStatus !== "playing" && (
        <div className="mt-6 text-center">
          <Link
            href={nextWordHref}
            prefetch={false}
            className="inline-flex rounded-full border px-5 py-2 font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
          >
            Next Word
          </Link>
        </div>
      )}
    </section>
  );
}

function createUnevaluatedRow(guess: string): DisplayTile[] {
  return Array.from({ length: WORDLE_WORD_LENGTH }, (_, index) => ({
    letter: guess[index] ?? "",
    status: null,
  }));
}

function getRowLabel(
  row: DisplayTile[],
  rowIndex: number,
  submittedGuessCount: number,
): string {
  if (rowIndex < submittedGuessCount) {
    const results = row
      .map(({ letter, status }) => `${letter} ${status}`)
      .join(", ");

    return `Guess ${rowIndex + 1}: ${results}`;
  }

  if (rowIndex === submittedGuessCount) {
    const currentGuess = row.map(({ letter }) => letter).join("");

    return currentGuess
      ? `Current guess: ${currentGuess}`
      : "Current guess is empty";
  }

  return `Attempt ${rowIndex + 1} is empty`;
}

function getTileStatusClass(tile: DisplayTile): string {
  switch (tile.status) {
    case "correct":
      return "border-green-700 bg-green-700 text-white";
    case "present":
      return "border-amber-500 bg-amber-500 text-neutral-950";
    case "absent":
      return "border-neutral-600 bg-neutral-600 text-white";
    default:
      return tile.letter
        ? "border-neutral-700 text-foreground dark:border-neutral-300"
        : "border-neutral-300 text-neutral-950";
  }
}
