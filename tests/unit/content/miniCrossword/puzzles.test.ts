import { describe, expect, it } from "vitest";

import { miniCrosswordPuzzles } from "@/content/miniCrossword/puzzles";
import { validateMiniCrosswordPuzzle } from "@/domain/miniCrossword/validation";

describe("Mini Crossword production content", () => {
  it("keeps every wedding-themed Mini Crossword valid", () => {
    expect(miniCrosswordPuzzles).toHaveLength(2);

    for (const puzzle of miniCrosswordPuzzles) {
      expect(validateMiniCrosswordPuzzle(puzzle)).toEqual([]);
    }
  });

  it("keeps the first 5x5 puzzle unchanged", () => {
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
  });

  it("defines the personalized 7x7 puzzle", () => {
    const puzzle = miniCrosswordPuzzles[1]!;

    expect(puzzle.id).toBe("wedding-02");
    expect(puzzle.title).toBe("How Well Do You Know Us?");
    expect(puzzle.grid.solution).toEqual([
      "T#BUBU#",
      "R#A##R#",
      "I#N##G#",
      "VEGGIES",
      "I##O###",
      "ALSO###",
      "###DUDU",
    ]);
    expect(puzzle.entries.map(({ answer }) => answer)).toEqual([
      "BUBU",
      "VEGGIES",
      "ALSO",
      "DUDU",
      "TRIVIA",
      "BANG",
      "URGE",
      "GOOD",
    ]);
  });
});
