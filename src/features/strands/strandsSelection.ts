import type { PublicStrandsPuzzle } from "@/contracts/strands";
import { areStrandsTilesAdjacent } from "@/domain/strands/gameplay";

export function updateStrandsSelection(
  puzzle: PublicStrandsPuzzle,
  selectedPath: number[],
  claimedTileIndexes: ReadonlySet<number>,
  tileIndex: number,
): number[] {
  if (
    !Number.isInteger(tileIndex) ||
    tileIndex < 0 ||
    tileIndex >= puzzle.grid.rows * puzzle.grid.columns ||
    claimedTileIndexes.has(tileIndex)
  ) {
    return selectedPath;
  }

  const finalTileIndex = selectedPath.at(-1);

  if (finalTileIndex === undefined) {
    return [tileIndex];
  }

  if (tileIndex === finalTileIndex) {
    return selectedPath.slice(0, -1);
  }

  const existingIndex = selectedPath.indexOf(tileIndex);

  if (existingIndex >= 0) {
    return selectedPath.slice(0, existingIndex + 1);
  }

  if (
    !areStrandsTilesAdjacent(finalTileIndex, tileIndex, puzzle.grid.columns)
  ) {
    return selectedPath;
  }

  return [...selectedPath, tileIndex];
}

export function getSelectedStrandsWord(
  puzzle: PublicStrandsPuzzle,
  selectedPath: number[],
): string {
  return selectedPath
    .map((tileIndex) => puzzle.grid.letters[tileIndex] ?? "")
    .join("");
}
