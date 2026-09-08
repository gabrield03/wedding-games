import type { PublicStrandsPuzzle } from "@/contracts/strands";

export function updateStrandsSelection(
  puzzle: PublicStrandsPuzzle,
  selectedPath: number[],
  claimedTileIndexes: ReadonlySet<number>,
  tileIndex: number,
): number[] {
  const tileCount = puzzle.grid.rows * puzzle.grid.columns;

  if (
    !Number.isInteger(tileIndex) ||
    tileIndex < 0 ||
    tileIndex >= tileCount ||
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
    !areTilesAdjacent(
      finalTileIndex,
      tileIndex,
      puzzle.grid.rows,
      puzzle.grid.columns,
    )
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

function areTilesAdjacent(
  firstIndex: number,
  secondIndex: number,
  rows: number,
  columns: number,
) {
  const tileCount = rows * columns;

  if (
    firstIndex < 0 ||
    secondIndex < 0 ||
    firstIndex >= tileCount ||
    secondIndex >= tileCount ||
    firstIndex === secondIndex
  ) {
    return false;
  }

  const firstRow = Math.floor(firstIndex / columns);
  const firstColumn = firstIndex % columns;
  const secondRow = Math.floor(secondIndex / columns);
  const secondColumn = secondIndex % columns;

  return (
    Math.abs(firstRow - secondRow) <= 1 &&
    Math.abs(firstColumn - secondColumn) <= 1
  );
}
