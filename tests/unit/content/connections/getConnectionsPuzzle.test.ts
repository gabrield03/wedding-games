import { describe, expect, it } from "vitest";

import { getConnectionsPuzzle } from "@/content/connections/getConnectionsPuzzle";

describe("getConnectionsPuzzle", () => {
  it("returns a valid local puzzle by ID", async () => {
    const puzzle = await getConnectionsPuzzle("development-puzzle");

    expect(puzzle).not.toBeNull();
    expect(puzzle?.id).toBe("development-puzzle");
  });

  it("returns null for an unknown puzzle ID", async () => {
    const puzzle = await getConnectionsPuzzle("does-not-exist");

    expect(puzzle).toBeNull();
  });
});
