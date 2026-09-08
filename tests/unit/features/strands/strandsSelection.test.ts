import { describe, expect, it } from "vitest";

import type { PublicStrandsPuzzle } from "@/contracts/strands";
import {
  getSelectedStrandsWord,
  updateStrandsSelection,
} from "@/features/strands/strandsSelection";

const puzzle: PublicStrandsPuzzle = {
  id: "wedding-01",
  themeClue: "The Big Day",
  grid: {
    rows: 8,
    columns: 6,
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUV",
  },
  answerCount: 7,
};

describe("Strands local selection", () => {
  it("builds adjacent paths without knowing the hidden answer set", () => {
    const claimed = new Set<number>();
    let path: number[] = [];

    path = updateStrandsSelection(puzzle, path, claimed, 0);
    path = updateStrandsSelection(puzzle, path, claimed, 1);
    path = updateStrandsSelection(puzzle, path, claimed, 7);

    expect(path).toEqual([0, 1, 7]);
    expect(getSelectedStrandsWord(puzzle, path)).toBe("ABH");
  });

  it("supports backtracking while rejecting claimed and nonadjacent tiles", () => {
    const claimed = new Set([2]);
    let path = [0, 1, 7];

    expect(updateStrandsSelection(puzzle, path, claimed, 2)).toBe(path);
    expect(updateStrandsSelection(puzzle, path, claimed, 20)).toBe(path);

    path = updateStrandsSelection(puzzle, path, claimed, 1);
    expect(path).toEqual([0, 1]);

    path = updateStrandsSelection(puzzle, path, claimed, 1);
    expect(path).toEqual([0]);
  });
});
