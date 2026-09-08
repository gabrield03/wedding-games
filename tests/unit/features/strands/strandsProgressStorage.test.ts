import { afterEach, describe, expect, it } from "vitest";

import {
  loadLastVisitedStrandsPuzzleId,
  saveLastVisitedStrandsPuzzleId,
} from "@/features/strands/strandsProgressStorage";

const lastVisitedKey = "wedding-games:strands:last-visited";

afterEach(() => {
  localStorage.clear();
});

describe("strandsProgressStorage", () => {
  it("stores only known last-visited Strands puzzle IDs", () => {
    saveLastVisitedStrandsPuzzleId("wedding-04");
    expect(loadLastVisitedStrandsPuzzleId()).toBe("wedding-04");

    saveLastVisitedStrandsPuzzleId("does-not-exist");
    expect(loadLastVisitedStrandsPuzzleId()).toBe("wedding-04");

    localStorage.setItem(lastVisitedKey, "stale-puzzle");
    expect(loadLastVisitedStrandsPuzzleId()).toBeNull();
  });

  it("does not use localStorage for Strands gameplay progress", () => {
    localStorage.setItem(
      "wedding-games:strands:progress:wedding-01",
      JSON.stringify({
        version: 1,
        foundWords: ["CEREMONY"],
        hintedWord: "RECEPTION",
      }),
    );

    saveLastVisitedStrandsPuzzleId("wedding-01");

    expect(loadLastVisitedStrandsPuzzleId()).toBe("wedding-01");
    expect(
      localStorage.getItem("wedding-games:strands:progress:wedding-01"),
    ).toBe(
      JSON.stringify({
        version: 1,
        foundWords: ["CEREMONY"],
        hintedWord: "RECEPTION",
      }),
    );
  });
});
