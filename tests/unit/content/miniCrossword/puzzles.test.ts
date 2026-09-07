import { describe, expect, it } from "vitest";

import { miniCrosswordPuzzles } from "@/content/miniCrossword/puzzles";
import { validateMiniCrosswordPuzzle } from "@/domain/miniCrossword/validation";

describe("Mini Crossword production content", () => {
  it("keeps the first wedding-themed Mini Crossword valid", () => {
    expect(miniCrosswordPuzzles).toHaveLength(1);

    const puzzle = miniCrosswordPuzzles[0]!;

    expect(puzzle.id).toBe("wedding-01");
    expect(puzzle.grid.solution).toEqual([
      "##GET",
      "#DEAR",
      "MARRY",
      "ARMS#",
      "YES##",
    ]);
    expect(puzzle.entries).toHaveLength(10);
    expect(validateMiniCrosswordPuzzle(puzzle)).toEqual([]);
  });
});
