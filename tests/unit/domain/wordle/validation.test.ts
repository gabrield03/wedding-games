import { describe, expect, it } from "vitest";

import type { WordlePuzzle } from "@/domain/wordle/types";
import { validateWordlePuzzle } from "@/domain/wordle/validation";

function createPuzzle(overrides: Partial<WordlePuzzle> = {}): WordlePuzzle {
  return {
    id: "test-wordle-puzzle",
    answer: "CRANE",
    ...overrides,
  };
}

describe("validateWordlePuzzle", () => {
  it("returns no errors for a valid puzzle", () => {
    expect(validateWordlePuzzle(createPuzzle())).toEqual([]);
  });

  it("rejects a blank puzzle ID", () => {
    const errors = validateWordlePuzzle(createPuzzle({ id: "   " }));

    expect(errors).toContain("Puzzle ID must not be empty");
  });

  it("rejects an answer with the wrong length", () => {
    const errors = validateWordlePuzzle(createPuzzle({ answer: "FOUR" }));

    expect(errors).toContain("Puzzle answer must contain exactly 5 letters");
  });

  it("rejects a non-alphabetic answer", () => {
    const errors = validateWordlePuzzle(createPuzzle({ answer: "AB1DE" }));

    expect(errors).toContain(
      "Puzzle answer must contain only ASCII alphabetic characters",
    );
  });
});
