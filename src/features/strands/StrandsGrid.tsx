"use client";

import type { StrandsPuzzle } from "@/domain/strands/types";

type StrandsGridProps = {
  puzzle: StrandsPuzzle;
  selectedPath: number[];
  claimedTileIndexes: number[];
  disabled: boolean;
  onSelectTile: (tileIndex: number) => void;
};

export function StrandsGrid({
  puzzle,
  selectedPath,
  claimedTileIndexes,
  disabled,
  onSelectTile,
}: StrandsGridProps) {
  const selectedTiles = new Set(selectedPath);
  const claimedTiles = new Set(claimedTileIndexes);

  return (
    <div
      className="mx-auto grid w-full max-w-md grid-cols-6 gap-2"
      role="grid"
      aria-label="Strands letter grid"
    >
      {Array.from(puzzle.grid.letters).map((letter, tileIndex) => {
        const selected = selectedTiles.has(tileIndex);
        const claimed = claimedTiles.has(tileIndex);
        const row = Math.floor(tileIndex / puzzle.grid.columns) + 1;
        const column = (tileIndex % puzzle.grid.columns) + 1;

        return (
          <button
            key={tileIndex}
            type="button"
            role="gridcell"
            aria-label={`${letter}, row ${row}, column ${column}${claimed ? ", found" : selected ? ", selected" : ""}`}
            aria-pressed={selected}
            aria-disabled={claimed || disabled}
            data-strands-tile={tileIndex}
            onClick={() => {
              if (!claimed && !disabled) {
                onSelectTile(tileIndex);
              }
            }}
            className={`flex aspect-square items-center justify-center rounded-full border text-xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 sm:text-2xl ${
              claimed
                ? "border-emerald-700 bg-emerald-700 text-white"
                : selected
                  ? "border-sky-700 bg-sky-700 text-white"
                  : "border-neutral-300 bg-background text-foreground hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            } ${claimed || disabled ? "cursor-default" : "cursor-pointer active:scale-95"}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
