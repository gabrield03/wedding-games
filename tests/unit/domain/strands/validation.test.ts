import { describe, expect, it } from "vitest";

import type { StrandsPuzzle } from "@/domain/strands/types";
import { validateStrandsPuzzle } from "@/domain/strands/validation";
import { testStrandsPuzzle } from "../../../fixtures/strands";

describe("validateStrandsPuzzle", () => {
  it("accepts a complete fixed-size puzzle", () => {
    expect(validateStrandsPuzzle(testStrandsPuzzle)).toEqual([]);
  });

  it("rejects blank puzzle identity and theme clue", () => {
    expect(
      validateStrandsPuzzle(puzzleWith({ id: " ", themeClue: "" })),
    ).toEqual(
      expect.arrayContaining([
        "Puzzle ID must not be empty",
        "Puzzle theme clue must not be empty",
      ]),
    );
  });

  it("rejects incorrect dimensions, letter count, and letter shape", () => {
    const errors = validateStrandsPuzzle({
      ...testStrandsPuzzle,
      grid: { rows: 7, columns: 7, letters: "abc" },
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "Puzzle grid must contain exactly 8 rows",
        "Puzzle grid must contain exactly 6 columns",
        "Puzzle grid must contain exactly 48 letters",
        "Puzzle grid must contain only uppercase ASCII letters",
      ]),
    );
  });

  it("requires theme words and canonical unique answer words", () => {
    const noThemes = validateStrandsPuzzle(puzzleWith({ themeWords: [] }));
    const malformed = structuredClone(testStrandsPuzzle);
    malformed.themeWords[0]!.word = "cat";
    malformed.spangram.word = malformed.themeWords[1]!.word;
    const malformedErrors = validateStrandsPuzzle(malformed);

    expect(noThemes).toContain("Puzzle must contain at least one theme word");
    expect(malformedErrors).toEqual(
      expect.arrayContaining([
        "Theme word cat must contain at least 4 uppercase ASCII letters",
        `Duplicate answer word: ${malformed.spangram.word}`,
      ]),
    );
  });

  it("rejects path length mismatches, invalid indexes, and repeated tiles", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[0]!.path = [0, 1, 1, 99, 2.5];
    const errors = validateStrandsPuzzle(puzzle);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Theme word ABCDEF path length must match its word length",
        "Theme word ABCDEF path indexes must be integers from 0 to 47",
        "Theme word ABCDEF path must not reuse a tile",
      ]),
    );
  });

  it("rejects non-adjacent answer paths and letter mismatches", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[0]!.path = [0, 2, 3, 4, 5, 11];
    const errors = validateStrandsPuzzle(puzzle);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Theme word ABCDEF path must use adjacent tiles",
        "Theme word ABCDEF path letters must spell ABCDEF",
      ]),
    );
  });

  it("rejects answer paths that geometrically cross themselves", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[0]!.path = [0, 7, 6, 1, 2, 3];

    expect(validateStrandsPuzzle(puzzle)).toContain(
      "Theme word ABCDEF path must not geometrically cross itself",
    );
  });

  it("rejects geometric crossings between different answer paths", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[0]!.path = [0, 7, 2, 3, 4, 5];
    puzzle.themeWords[1]!.path = [6, 1, 8, 9, 10, 11];

    const letters = [...puzzle.grid.letters];
    [letters[1], letters[7]] = [letters[7]!, letters[1]!];
    puzzle.grid.letters = letters.join("");

    expect(validateStrandsPuzzle(puzzle)).toContain(
      "Answer paths ABCDEF and GHIJKL must not geometrically cross",
    );
  });

  it("rejects answers that can be spelled through multiple valid paths", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[2]!.word = "MNOPQR";
    const letters = Array.from(puzzle.grid.letters);
    letters[17] = "R";
    puzzle.grid.letters = letters.join("");

    expect(validateStrandsPuzzle(puzzle)).toContain(
      "Theme word MNOPQR has multiple valid paths that spell MNOPQR",
    );
  });

  it("rejects overlapping answers and incomplete grid coverage", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.themeWords[1]!.path = [...puzzle.themeWords[0]!.path];
    const errors = validateStrandsPuzzle(puzzle);

    expect(
      errors.some((error) => error.startsWith("Tile index 0 is shared")),
    ).toBe(true);
    expect(
      errors.some((error) =>
        error.startsWith("Puzzle has uncovered tile indexes:"),
      ),
    ).toBe(true);
  });

  it("requires the spangram to touch top and bottom or left and right", () => {
    const puzzle = structuredClone(testStrandsPuzzle);
    puzzle.spangram.path = [12, 13, 14, 15, 16, 22, 21, 20, 19, 25, 26, 27];

    expect(validateStrandsPuzzle(puzzle)).toContain(
      "Spangram path must touch two opposite grid edges",
    );
  });
});

function puzzleWith(overrides: Partial<StrandsPuzzle>): StrandsPuzzle {
  return { ...structuredClone(testStrandsPuzzle), ...overrides };
}
