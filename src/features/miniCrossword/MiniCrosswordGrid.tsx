"use client";

import { useRef } from "react";

import {
  MINI_CROSSWORD_BLOCK,
  type MiniCrosswordCell,
  type MiniCrosswordEntry,
  type MiniCrosswordPuzzle,
} from "@/domain/miniCrossword/types";

type MiniCrosswordGridProps = {
  puzzle: MiniCrosswordPuzzle;
  letters: Array<string | null>;
  selectedCell: MiniCrosswordCell;
  activeEntry: MiniCrosswordEntry | null;
  disabled: boolean;
  onSelectCell: (cell: MiniCrosswordCell) => void;
  onRequestTextInput: () => void;
};

export function MiniCrosswordGrid({
  puzzle,
  letters,
  selectedCell,
  activeEntry,
  disabled,
  onSelectCell,
  onRequestTextInput,
}: MiniCrosswordGridProps) {
  const pointerDownCellRef = useRef<string | null>(null);
  const activeCells = new Set(
    activeEntry?.cells.map(({ row, column }) => cellKey(row, column)) ?? [],
  );
  const clueNumbers = getClueNumbers(puzzle);

  return (
    <div
      className="mx-auto grid w-full max-w-sm border-l border-t border-neutral-800 dark:border-neutral-300"
      style={{
        gridTemplateColumns: `repeat(${puzzle.grid.columns}, minmax(0, 1fr))`,
      }}
      role="grid"
      aria-label="Mini Crossword board"
      aria-rowcount={puzzle.grid.rows}
      aria-colcount={puzzle.grid.columns}
    >
      {Array.from(
        { length: puzzle.grid.rows * puzzle.grid.columns },
        (_, cellIndex) => {
          const row = Math.floor(cellIndex / puzzle.grid.columns);
          const column = cellIndex % puzzle.grid.columns;
          const cell = { row, column };
          const solutionCharacter = puzzle.grid.solution[row]![column]!;
          const blocked = solutionCharacter === MINI_CROSSWORD_BLOCK;
          const selected =
            selectedCell.row === row && selectedCell.column === column;
          const active = activeCells.has(cellKey(row, column));
          const key = cellKey(row, column);
          const clueNumber = clueNumbers.get(key);

          if (blocked) {
            return (
              <div
                key={cellIndex}
                role="gridcell"
                aria-label={`Blocked cell, row ${row + 1}, column ${column + 1}`}
                className="aspect-square border-r border-b border-neutral-800 bg-neutral-900 dark:border-neutral-300 dark:bg-neutral-900"
                data-mini-crossword-block
              />
            );
          }

          const letter = letters[cellIndex] ?? "";

          return (
            <button
              key={cellIndex}
              type="button"
              role="gridcell"
              aria-label={`${clueNumber ? `Clue ${clueNumber}, ` : ""}row ${row + 1}, column ${column + 1}${letter ? `, letter ${letter}` : ", empty"}`}
              aria-selected={selected}
              disabled={disabled}
              onPointerDown={() => {
                pointerDownCellRef.current = key;
              }}
              onPointerCancel={() => {
                pointerDownCellRef.current = null;
              }}
              onPointerLeave={() => {
                if (pointerDownCellRef.current === key) {
                  pointerDownCellRef.current = null;
                }
              }}
              onClick={(event) => {
                onSelectCell(cell);
                pointerDownCellRef.current = null;

                if (event.detail > 0) {
                  onRequestTextInput();
                }
              }}
              onFocus={() => {
                if (!selected && pointerDownCellRef.current !== key) {
                  onSelectCell(cell);
                }
              }}
              data-mini-crossword-cell={`${row}-${column}`}
              data-active-answer={active ? "true" : "false"}
              className={`relative aspect-square border-r border-b border-neutral-800 text-2xl font-bold uppercase transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-inset dark:border-neutral-300 sm:text-3xl ${
                selected
                  ? "bg-sky-500 text-neutral-950"
                  : active
                    ? "bg-sky-100 text-neutral-950 dark:bg-sky-900 dark:text-white"
                    : "bg-background text-foreground dark:bg-white dark:text-neutral-950"
              } disabled:cursor-default`}
            >
              {clueNumber && (
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-0.5 text-[0.6rem] font-semibold leading-none sm:text-xs"
                >
                  {clueNumber}
                </span>
              )}
              <span aria-hidden="true">{letter}</span>
            </button>
          );
        },
      )}
    </div>
  );
}

function getClueNumbers(puzzle: MiniCrosswordPuzzle): Map<string, number> {
  const numbers = new Map<string, number>();

  for (const entry of puzzle.entries) {
    const start = entry.cells[0];

    if (start) {
      numbers.set(cellKey(start.row, start.column), entry.number);
    }
  }

  return numbers;
}

function cellKey(row: number, column: number): string {
  return `${row}:${column}`;
}
