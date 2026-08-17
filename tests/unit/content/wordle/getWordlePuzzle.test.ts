import { describe, expect, it } from "vitest";

import { getWordlePuzzle } from "@/content/wordle/getWordlePuzzle";
import { selectRandomWordlePuzzleId } from "@/content/wordle/puzzles";
import { validateWordlePuzzle } from "@/domain/wordle/validation";

describe("getWordlePuzzle", () => {
  it("returns the expected validated local puzzle by ID", async () => {
    const puzzle = await getWordlePuzzle("wedding-01");

    expect(puzzle).toEqual({
      id: "wedding-01",
      answer: "BRIDE",
    });
    expect(validateWordlePuzzle(puzzle!)).toEqual([]);
  });

  it("returns null for an unknown puzzle ID", async () => {
    const puzzle = await getWordlePuzzle("does-not-exist");

    expect(puzzle).toBeNull();
  });

  it("selects a stored puzzle ID that remains loadable", async () => {
    const selectedPuzzleId = selectRandomWordlePuzzleId();

    expect(selectedPuzzleId).toMatch(/^wedding-(0[1-9]|10)$/);
    expect(await getWordlePuzzle(selectedPuzzleId)).not.toBeNull();
  });

  it("excludes a stored puzzle ID from random selection", () => {
    const excludedPuzzleId = "wedding-01";

    expect(selectRandomWordlePuzzleId(excludedPuzzleId)).not.toBe(
      excludedPuzzleId,
    );
  });
});
