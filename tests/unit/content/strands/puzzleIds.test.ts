import { describe, expect, it } from "vitest";

import {
  getNextStrandsPuzzleId,
  STRANDS_PUZZLE_IDS,
} from "@/content/strands/puzzleIds";

describe("Strands puzzle navigation", () => {
  it("keeps a deterministic opaque puzzle order", () => {
    expect(STRANDS_PUZZLE_IDS).toEqual([
      "wedding-01",
      "wedding-02",
      "wedding-03",
      "wedding-04",
      "wedding-05",
    ]);
  });

  it("cycles through every puzzle and wraps to the first puzzle", () => {
    expect(getNextStrandsPuzzleId("wedding-01")).toBe("wedding-02");
    expect(getNextStrandsPuzzleId("wedding-02")).toBe("wedding-03");
    expect(getNextStrandsPuzzleId("wedding-03")).toBe("wedding-04");
    expect(getNextStrandsPuzzleId("wedding-04")).toBe("wedding-05");
    expect(getNextStrandsPuzzleId("wedding-05")).toBe("wedding-01");
  });

  it("returns null for an unknown puzzle ID", () => {
    expect(getNextStrandsPuzzleId("not-a-puzzle")).toBeNull();
  });
});
