import { afterEach, describe, expect, it } from "vitest";

import { miniCrosswordPuzzles } from "@/content/miniCrossword/puzzles";
import {
  clearMiniCrosswordPuzzleProgress,
  loadLastVisitedMiniCrosswordPuzzleId,
  loadMiniCrosswordPuzzleProgress,
  saveLastVisitedMiniCrosswordPuzzleId,
  saveMiniCrosswordPuzzleProgress,
} from "@/features/miniCrossword/miniCrosswordProgressStorage";

const firstPuzzle = miniCrosswordPuzzles[0]!;
const secondPuzzle = miniCrosswordPuzzles[1]!;
const firstProgressKey = `wedding-games:mini-crossword:progress:${firstPuzzle.id}`;
const lastVisitedKey = "wedding-games:mini-crossword:last-visited";

afterEach(() => {
  localStorage.clear();
});

describe("miniCrosswordProgressStorage", () => {
  it("round-trips in-progress puzzle state", () => {
    const letters = Array<string | null>(
      firstPuzzle.grid.rows * firstPuzzle.grid.columns,
    ).fill(null);
    letters[2] = "G";

    saveMiniCrosswordPuzzleProgress(firstPuzzle, {
      letters,
      status: "playing",
    });

    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toEqual({
      version: 1,
      letters,
      status: "playing",
    });
  });

  it("keeps progress independent across Mini Crossword puzzles", () => {
    const firstLetters = Array<string | null>(
      firstPuzzle.grid.rows * firstPuzzle.grid.columns,
    ).fill(null);
    const secondLetters = Array<string | null>(
      secondPuzzle.grid.rows * secondPuzzle.grid.columns,
    ).fill(null);

    firstLetters[2] = "G";
    secondLetters[0] = "T";

    saveMiniCrosswordPuzzleProgress(firstPuzzle, {
      letters: firstLetters,
      status: "playing",
    });
    saveMiniCrosswordPuzzleProgress(secondPuzzle, {
      letters: secondLetters,
      status: "playing",
    });

    clearMiniCrosswordPuzzleProgress(firstPuzzle.id);

    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toBeNull();
    expect(loadMiniCrosswordPuzzleProgress(secondPuzzle)?.letters[0]).toBe("T");
  });

  it("rejects malformed, outdated, and puzzle-inconsistent progress", () => {
    localStorage.setItem(firstProgressKey, "not-json");
    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toBeNull();

    localStorage.setItem(
      firstProgressKey,
      JSON.stringify({ version: 2, letters: [], status: "playing" }),
    );
    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toBeNull();

    localStorage.setItem(
      firstProgressKey,
      JSON.stringify({
        version: 1,
        letters: Array(firstPuzzle.grid.rows * firstPuzzle.grid.columns).fill(
          null,
        ),
        status: "complete",
      }),
    );
    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toBeNull();
  });

  it("removes empty playing progress", () => {
    saveMiniCrosswordPuzzleProgress(firstPuzzle, {
      letters: Array(firstPuzzle.grid.rows * firstPuzzle.grid.columns).fill(
        null,
      ),
      status: "playing",
    });

    expect(loadMiniCrosswordPuzzleProgress(firstPuzzle)).toBeNull();
  });

  it("stores only known last-visited Mini Crossword puzzle IDs", () => {
    saveLastVisitedMiniCrosswordPuzzleId("wedding-02");
    expect(loadLastVisitedMiniCrosswordPuzzleId()).toBe("wedding-02");

    saveLastVisitedMiniCrosswordPuzzleId("does-not-exist");
    expect(loadLastVisitedMiniCrosswordPuzzleId()).toBe("wedding-02");

    localStorage.setItem(lastVisitedKey, "stale-puzzle");
    expect(loadLastVisitedMiniCrosswordPuzzleId()).toBeNull();
  });
});
