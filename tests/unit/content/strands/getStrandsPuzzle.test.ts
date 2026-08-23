import { describe, expect, it, vi } from "vitest";

import { getStrandsPuzzle } from "@/content/strands/getStrandsPuzzle";
import {
  STRANDS_GRID_COLUMNS,
  STRANDS_GRID_ROWS,
  STRANDS_TILE_COUNT,
} from "@/domain/strands/types";
import { validateStrandsPuzzle } from "@/domain/strands/validation";

vi.mock("server-only", () => ({}));

describe("getStrandsPuzzle", () => {
  it("returns the validated production G1 puzzle", async () => {
    const puzzle = await getStrandsPuzzle("the-big-day");

    expect(puzzle).toMatchObject({
      id: "the-big-day",
      themeClue: "The Big Day",
      grid: { rows: STRANDS_GRID_ROWS, columns: STRANDS_GRID_COLUMNS },
      themeWords: [
        { word: "CEREMONY" },
        { word: "RECEPTION" },
        { word: "BOUQUET" },
        { word: "GUESTS" },
        { word: "VOWS" },
        { word: "VEIL" },
      ],
      spangram: { word: "WEDDINGDAY" },
    });
    expect(validateStrandsPuzzle(puzzle!)).toEqual([]);
  });

  it("returns null for an unknown puzzle ID", async () => {
    await expect(getStrandsPuzzle("does-not-exist")).resolves.toBeNull();
  });

  it("uses every tile exactly once and stores paths that spell each answer", async () => {
    const puzzle = (await getStrandsPuzzle("the-big-day"))!;
    const answers = [...puzzle.themeWords, puzzle.spangram];
    const usedTiles = answers.flatMap(({ path }) => path);

    expect(usedTiles).toHaveLength(STRANDS_TILE_COUNT);
    expect(new Set(usedTiles)).toEqual(
      new Set(
        Array.from({ length: STRANDS_TILE_COUNT }, (_, tileIndex) => tileIndex),
      ),
    );

    for (const answer of answers) {
      expect(
        answer.path.map((index) => puzzle.grid.letters[index]).join(""),
      ).toBe(answer.word);
    }
  });

  it("stores a spangram path that touches the top and bottom edges", async () => {
    const puzzle = (await getStrandsPuzzle("the-big-day"))!;
    const rows = puzzle.spangram.path.map((tileIndex) =>
      Math.floor(tileIndex / STRANDS_GRID_COLUMNS),
    );

    expect(rows).toContain(0);
    expect(rows).toContain(STRANDS_GRID_ROWS - 1);
  });
});
