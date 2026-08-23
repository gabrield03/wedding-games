import { afterEach, describe, expect, it } from "vitest";

import {
  clearStrandsPuzzleProgress,
  loadLastVisitedStrandsPuzzleId,
  loadStrandsPuzzleProgress,
  saveLastVisitedStrandsPuzzleId,
  saveStrandsPuzzleProgress,
} from "@/features/strands/strandsProgressStorage";
import { testStrandsPuzzle } from "../../../fixtures/strands";

const progressKey = `wedding-games:strands:progress:${testStrandsPuzzle.id}`;
const lastVisitedKey = "wedding-games:strands:last-visited";

afterEach(() => {
  localStorage.clear();
});

describe("strandsProgressStorage", () => {
  it("round-trips only durable puzzle progress", () => {
    const foundWord = testStrandsPuzzle.themeWords[0]!.word;
    const hintedWord = testStrandsPuzzle.themeWords[1]!.word;

    saveStrandsPuzzleProgress(testStrandsPuzzle, {
      foundWords: [foundWord],
      hintedWord,
    });

    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toEqual({
      version: 1,
      foundWords: [foundWord],
      hintedWord,
    });
  });

  it("rejects malformed, outdated, and puzzle-inconsistent progress", () => {
    localStorage.setItem(progressKey, "not-json");
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();

    localStorage.setItem(
      progressKey,
      JSON.stringify({ version: 2, foundWords: [], hintedWord: null }),
    );
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();

    localStorage.setItem(
      progressKey,
      JSON.stringify({
        version: 1,
        foundWords: ["NOTANANSWER"],
        hintedWord: null,
      }),
    );
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();

    const foundWord = testStrandsPuzzle.themeWords[0]!.word;
    localStorage.setItem(
      progressKey,
      JSON.stringify({
        version: 1,
        foundWords: [foundWord],
        hintedWord: foundWord,
      }),
    );
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();
  });

  it("removes empty or explicitly cleared puzzle progress", () => {
    saveStrandsPuzzleProgress(testStrandsPuzzle, {
      foundWords: [testStrandsPuzzle.themeWords[0]!.word],
      hintedWord: null,
    });
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).not.toBeNull();

    saveStrandsPuzzleProgress(testStrandsPuzzle, {
      foundWords: [],
      hintedWord: null,
    });
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();

    saveStrandsPuzzleProgress(testStrandsPuzzle, {
      foundWords: [],
      hintedWord: testStrandsPuzzle.themeWords[0]!.word,
    });
    clearStrandsPuzzleProgress(testStrandsPuzzle.id);
    expect(loadStrandsPuzzleProgress(testStrandsPuzzle)).toBeNull();
  });

  it("stores only known last-visited Strands puzzle IDs", () => {
    saveLastVisitedStrandsPuzzleId("wedding-04");
    expect(loadLastVisitedStrandsPuzzleId()).toBe("wedding-04");

    saveLastVisitedStrandsPuzzleId("does-not-exist");
    expect(loadLastVisitedStrandsPuzzleId()).toBe("wedding-04");

    localStorage.setItem(lastVisitedKey, "stale-puzzle");
    expect(loadLastVisitedStrandsPuzzleId()).toBeNull();
  });
});
