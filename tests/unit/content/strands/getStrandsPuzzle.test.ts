import { describe, expect, it, vi } from "vitest";

import { getStrandsPuzzle } from "@/content/strands/getStrandsPuzzle";
import { STRANDS_PUZZLE_IDS } from "@/content/strands/puzzleIds";
import {
  STRANDS_GRID_COLUMNS,
  STRANDS_GRID_ROWS,
  STRANDS_TILE_COUNT,
} from "@/domain/strands/types";
import { validateStrandsPuzzle } from "@/domain/strands/validation";

vi.mock("server-only", () => ({}));

const EXPECTED_PUZZLES = [
  {
    id: "wedding-01",
    themeClue: "The Big Day",
    spangram: "WEDDINGDAY",
    themeWords: ["CEREMONY", "RECEPTION", "BOUQUET", "GUESTS", "VOWS", "VEIL"],
  },
  {
    id: "wedding-02",
    themeClue: "Places we've been",
    spangram: "OURTRAVELS",
    themeWords: ["KYOTO", "ROME", "FLORENCE", "NAPLES", "VANCOUVER", "CANCUN"],
  },
  {
    id: "wedding-03",
    themeClue: "A go-to date night meal",
    spangram: "HOTPOTNIGHT",
    themeWords: ["MUSHROOM", "FISHBALL", "NOODLES", "SHRIMP", "TOFU", "BEEF"],
  },
  {
    id: "wedding-04",
    themeClue: "An expensive dinner",
    spangram: "OMAKASE",
    themeWords: [
      "NIGIRI",
      "SASHIMI",
      "SCALLOP",
      "SALMON",
      "OTORO",
      "WASABI",
      "NORI",
    ],
  },
] as const;

describe("getStrandsPuzzle", () => {
  it("loads every production Strands puzzle through opaque public IDs", async () => {
    expect(STRANDS_PUZZLE_IDS).toEqual(EXPECTED_PUZZLES.map(({ id }) => id));

    for (const expected of EXPECTED_PUZZLES) {
      const puzzle = await getStrandsPuzzle(expected.id);

      expect(puzzle).toMatchObject({
        id: expected.id,
        themeClue: expected.themeClue,
        grid: { rows: STRANDS_GRID_ROWS, columns: STRANDS_GRID_COLUMNS },
        spangram: { word: expected.spangram },
      });
      expect(puzzle?.themeWords.map(({ word }) => word)).toEqual(
        expected.themeWords,
      );
      expect(validateStrandsPuzzle(puzzle!)).toEqual([]);
    }
  });

  it("returns null for unknown and old semantic puzzle IDs", async () => {
    await expect(getStrandsPuzzle("does-not-exist")).resolves.toBeNull();
    await expect(getStrandsPuzzle("the-big-day")).resolves.toBeNull();
  });

  it("uses every tile exactly once and stores paths that spell each answer", async () => {
    for (const puzzleId of STRANDS_PUZZLE_IDS) {
      const puzzle = (await getStrandsPuzzle(puzzleId))!;
      const answers = [...puzzle.themeWords, puzzle.spangram];
      const usedTiles = answers.flatMap(({ path }) => path);

      expect(usedTiles).toHaveLength(STRANDS_TILE_COUNT);
      expect(new Set(usedTiles)).toEqual(
        new Set(
          Array.from(
            { length: STRANDS_TILE_COUNT },
            (_, tileIndex) => tileIndex,
          ),
        ),
      );

      for (const answer of answers) {
        expect(
          answer.path.map((index) => puzzle.grid.letters[index]).join(""),
        ).toBe(answer.word);
      }
    }
  });

  it("stores spangrams that touch opposite board edges", async () => {
    for (const puzzleId of STRANDS_PUZZLE_IDS) {
      const puzzle = (await getStrandsPuzzle(puzzleId))!;
      expect(touchesOppositeEdges(puzzle.spangram.path)).toBe(true);
    }
  });
});

function touchesOppositeEdges(path: number[]) {
  const touchesTop = path.some(
    (tileIndex) => Math.floor(tileIndex / STRANDS_GRID_COLUMNS) === 0,
  );
  const touchesBottom = path.some(
    (tileIndex) =>
      Math.floor(tileIndex / STRANDS_GRID_COLUMNS) === STRANDS_GRID_ROWS - 1,
  );
  const touchesLeft = path.some(
    (tileIndex) => tileIndex % STRANDS_GRID_COLUMNS === 0,
  );
  const touchesRight = path.some(
    (tileIndex) =>
      tileIndex % STRANDS_GRID_COLUMNS === STRANDS_GRID_COLUMNS - 1,
  );

  return (touchesTop && touchesBottom) || (touchesLeft && touchesRight);
}
