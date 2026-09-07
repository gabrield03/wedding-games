import { describe, expect, it } from "vitest";

import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";
import { validateMiniCrosswordPuzzle } from "@/domain/miniCrossword/validation";
import { testMiniCrosswordPuzzle } from "../../../fixtures/miniCrossword";

describe("validateMiniCrosswordPuzzle", () => {
  it("accepts a complete rectangular crossword", () => {
    expect(validateMiniCrosswordPuzzle(testMiniCrosswordPuzzle)).toEqual([]);
  });

  it("rejects blank puzzle identity", () => {
    const errors = validateMiniCrosswordPuzzle(
      puzzleWith({ id: " ", title: "" }),
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        "Puzzle ID must not be empty",
        "Puzzle title must not be empty",
      ]),
    );
  });

  it("rejects inconsistent dimensions and unsupported grid characters", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    puzzle.grid.rows = 4;
    puzzle.grid.columns = 4;
    puzzle.grid.solution[0] = "##a?";

    const errors = validateMiniCrosswordPuzzle(puzzle);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Puzzle grid solution row count must match grid rows",
        "Puzzle grid row 0 must contain only uppercase ASCII letters or # blocks",
      ]),
    );
    expect(
      errors.some((error) =>
        error.startsWith("Puzzle grid row 1 must contain exactly 4 cells"),
      ),
    ).toBe(true);
  });

  it("rejects malformed clues and answers", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    puzzle.entries[0]!.clue = " ";
    puzzle.entries[0]!.answer = "a";

    expect(validateMiniCrosswordPuzzle(puzzle)).toEqual(
      expect.arrayContaining([
        "Clue 1 across clue must not be empty",
        "Clue 1 across answer must contain at least 2 uppercase ASCII letters",
        "Clue 1 across cell count must match its answer length",
      ]),
    );
  });

  it("rejects cells outside the grid and cells that pass through blocks", () => {
    const outside = structuredClone(testMiniCrosswordPuzzle);
    outside.entries[0]!.cells[0] = { row: 8, column: 8 };

    expect(validateMiniCrosswordPuzzle(outside)).toContain(
      "Clue 1 across cells must stay within the puzzle grid",
    );

    const blocked = structuredClone(testMiniCrosswordPuzzle);
    blocked.entries[0]!.cells[0] = { row: 0, column: 0 };

    expect(validateMiniCrosswordPuzzle(blocked)).toContain(
      "Clue 1 across must not pass through blocked cell row 0, column 0",
    );
  });

  it("rejects answer letters that disagree with the solution grid", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    puzzle.entries[0]!.answer = "ZBC";

    expect(validateMiniCrosswordPuzzle(puzzle)).toContain(
      "Clue 1 across answer must match the solution grid at row 0, column 2",
    );
  });

  it("rejects inconsistent letters at an Across/Down crossing", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    const downOne = puzzle.entries.find(
      ({ number, direction }) => number === 1 && direction === "down",
    )!;
    downOne.answer = "ZEJOS";

    expect(validateMiniCrosswordPuzzle(puzzle)).toContain(
      "Crossing at row 0, column 2 has inconsistent letters",
    );
  });

  it("rejects duplicate and geometry-inconsistent clue numbering", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    const acrossFour = puzzle.entries.find(
      ({ number, direction }) => number === 4 && direction === "across",
    )!;
    acrossFour.number = 1;

    const errors = validateMiniCrosswordPuzzle(puzzle);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Duplicate clue number 1 for across",
        "Clue number 1 must refer to one start cell",
        "Clue 1 across number must be 4 for its start cell",
      ]),
    );
  });

  it("rejects paths that do not follow the complete declared direction", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    puzzle.entries[0]!.cells = [
      { row: 0, column: 2 },
      { row: 0, column: 4 },
      { row: 0, column: 3 },
    ];

    expect(validateMiniCrosswordPuzzle(puzzle)).toContain(
      "Clue 1 across cells must follow the complete across answer path",
    );
  });

  it("requires every geometric entry to be declared", () => {
    const puzzle = structuredClone(testMiniCrosswordPuzzle);
    puzzle.entries = puzzle.entries.filter(
      ({ number, direction }) => !(number === 6 && direction === "across"),
    );

    expect(validateMiniCrosswordPuzzle(puzzle)).toContain(
      "Missing across entry starting at row 3, column 0",
    );
  });

  it("rejects playable cells that belong to no valid entry", () => {
    const puzzle: MiniCrosswordPuzzle = {
      id: "isolated",
      title: "Isolated",
      grid: {
        rows: 1,
        columns: 1,
        solution: ["A"],
      },
      entries: [],
    };

    expect(validateMiniCrosswordPuzzle(puzzle)).toEqual(
      expect.arrayContaining([
        "Puzzle must contain at least one entry",
        "Playable cell row 0, column 0 is not covered by an entry",
      ]),
    );
  });
});

function puzzleWith(
  overrides: Partial<MiniCrosswordPuzzle>,
): MiniCrosswordPuzzle {
  return {
    ...structuredClone(testMiniCrosswordPuzzle),
    ...overrides,
  };
}
