import { describe, expect, it } from "vitest";

import { getWordlePuzzle } from "@/content/wordle/getWordlePuzzle";
import { featuredWordlePuzzleId } from "@/content/wordle/puzzles";
import { validateWordlePuzzle } from "@/domain/wordle/validation";

describe("getWordlePuzzle", () => {
  it("returns the expected validated local puzzle by ID", async () => {
    const puzzle = await getWordlePuzzle(featuredWordlePuzzleId);

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
});
