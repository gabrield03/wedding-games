import { describe, expect, it } from "vitest";

import {
  areStrandsTilesAdjacent,
  clearStrandsPath,
  createInitialStrandsGameState,
  getClaimedStrandsTileIndexes,
  getStrandsAnswerMatch,
  getStrandsGameStatus,
  getStrandsPathWord,
  submitStrandsPath,
  updateStrandsPath,
} from "@/domain/strands/gameplay";
import type { StrandsAnswer, StrandsGameState } from "@/domain/strands/types";
import { testStrandsPuzzle } from "../../../fixtures/strands";

describe("Strands gameplay", () => {
  it("recognizes horizontal, vertical, and diagonal adjacency without row wrapping", () => {
    expect(areStrandsTilesAdjacent(0, 1)).toBe(true);
    expect(areStrandsTilesAdjacent(0, 6)).toBe(true);
    expect(areStrandsTilesAdjacent(0, 7)).toBe(true);
    expect(areStrandsTilesAdjacent(0, 8)).toBe(false);
    expect(areStrandsTilesAdjacent(5, 6)).toBe(false);
    expect(areStrandsTilesAdjacent(3, 3)).toBe(false);
    expect(areStrandsTilesAdjacent(48, 49)).toBe(false);
  });

  it("starts and immutably extends a path in selection order", () => {
    const initial = createInitialStrandsGameState();
    const started = updateStrandsPath(testStrandsPuzzle, initial, 0);
    const extended = updateStrandsPath(testStrandsPuzzle, started, 1);

    expect(initial).toEqual({ selectedPath: [], foundWords: [] });
    expect(started.selectedPath).toEqual([0]);
    expect(extended.selectedPath).toEqual([0, 1]);
    expect(extended).not.toBe(started);
    expect(extended.selectedPath).not.toBe(started.selectedPath);
  });

  it("ignores non-adjacent extensions", () => {
    const state = stateWithPath([0, 1, 7]);

    expect(updateStrandsPath(testStrandsPuzzle, state, 20)).toBe(state);
  });

  it("removes the current final tile when it is selected again", () => {
    const state = stateWithPath([0, 1, 7]);
    const shortened = updateStrandsPath(testStrandsPuzzle, state, 7);
    const cleared = updateStrandsPath(testStrandsPuzzle, stateWithPath([0]), 0);

    expect(shortened.selectedPath).toEqual([0, 1]);
    expect(cleared.selectedPath).toEqual([]);
    expect(state.selectedPath).toEqual([0, 1, 7]);
  });

  it("backtracks directly to any earlier selected tile", () => {
    const state = stateWithPath([0, 1, 7, 8, 14]);
    const backtracked = updateStrandsPath(testStrandsPuzzle, state, 1);

    expect(backtracked.selectedPath).toEqual([0, 1]);
    expect(state.selectedPath).toEqual([0, 1, 7, 8, 14]);
  });

  it("rejects claimed tiles during normal path construction", () => {
    const state: StrandsGameState = {
      selectedPath: [6],
      foundWords: [testStrandsPuzzle.themeWords[0]!.word],
    };

    expect(getClaimedStrandsTileIndexes(testStrandsPuzzle, state)).toEqual(
      testStrandsPuzzle.themeWords[0]!.path,
    );
    expect(updateStrandsPath(testStrandsPuzzle, state, 0)).toBe(state);
  });

  it("constructs words from row-major tiles in selection order", () => {
    expect(getStrandsPathWord(testStrandsPuzzle, [0, 1, 7, 6])).toBe("ABHG");
    expect(() => getStrandsPathWord(testStrandsPuzzle, [48])).toThrow(
      "Strands tile indexes must be integers from 0 to 47.",
    );
  });

  it("matches exact forward and reverse answer paths", () => {
    const answer = testStrandsPuzzle.themeWords[0]!;

    expect(getStrandsAnswerMatch(testStrandsPuzzle, answer.path)).toEqual({
      word: answer.word,
      kind: "theme",
    });
    expect(
      getStrandsAnswerMatch(testStrandsPuzzle, [...answer.path].reverse()),
    ).toEqual({ word: answer.word, kind: "theme" });
    expect(getStrandsAnswerMatch(testStrandsPuzzle, [0, 1, 2, 8])).toBeNull();
  });

  it("discovers a theme word through its forward stored path", () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const result = submitAnswer(createInitialStrandsGameState(), answer);

    expect(result).toMatchObject({
      status: "found_theme",
      word: answer.word,
      state: { selectedPath: [], foundWords: [answer.word] },
    });
  });

  it("discovers the spangram through its reversed stored path without ending the game early", () => {
    const result = submitStrandsPath(testStrandsPuzzle, {
      selectedPath: [...testStrandsPuzzle.spangram.path].reverse(),
      foundWords: [],
    });

    expect(result).toMatchObject({
      status: "found_spangram",
      word: testStrandsPuzzle.spangram.word,
    });
    expect(getStrandsGameStatus(testStrandsPuzzle, result.state)).toBe("playing");
  });

  it("keeps the game active after finding the spangram in the middle of progress", () => {
    const firstTheme = testStrandsPuzzle.themeWords[0]!;
    const result = submitStrandsPath(testStrandsPuzzle, {
      selectedPath: [...testStrandsPuzzle.spangram.path],
      foundWords: [firstTheme.word],
    });

    expect(result.status).toBe("found_spangram");
    expect(result.state.foundWords).toEqual([
      firstTheme.word,
      testStrandsPuzzle.spangram.word,
    ]);
    expect(getStrandsGameStatus(testStrandsPuzzle, result.state)).toBe("playing");
  });

  it("rejects a different path even when its selected letters spell an answer", () => {
    const wrongPath = [0, 1, 2, 8, 7, 6];
    const letters = [...testStrandsPuzzle.grid.letters];

    for (const [index, letter] of [..."ABCDEF"].entries()) {
      letters[wrongPath[index]!] = letter;
    }

    const puzzle = {
      ...testStrandsPuzzle,
      grid: { ...testStrandsPuzzle.grid, letters: letters.join("") },
    };
    const result = submitStrandsPath(puzzle, stateWithPath(wrongPath));

    expect(getStrandsPathWord(puzzle, wrongPath)).toBe("ABCDEF");
    expect(result.status).toBe("not_theme");
  });

  it("returns already_found defensively without adding the word again", () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const result = submitStrandsPath(testStrandsPuzzle, {
      selectedPath: [...answer.path],
      foundWords: [answer.word],
    });

    expect(result).toMatchObject({
      status: "already_found",
      word: answer.word,
      state: { selectedPath: [], foundWords: [answer.word] },
    });
  });

  it("rejects reconstructed non-answer paths that cross claimed tiles", () => {
    const result = submitStrandsPath(testStrandsPuzzle, {
      selectedPath: [0, 6, 12, 18],
      foundWords: [testStrandsPuzzle.themeWords[0]!.word],
    });

    expect(result.status).toBe("invalid_path");
  });

  it("distinguishes a valid non-theme path from an invalid path", () => {
    const notTheme = submitStrandsPath(
      testStrandsPuzzle,
      stateWithPath([0, 6, 12, 18]),
    );
    const invalid = submitStrandsPath(
      testStrandsPuzzle,
      stateWithPath([0, 2, 3, 4]),
    );

    expect(notTheme.status).toBe("not_theme");
    expect(invalid.status).toBe("invalid_path");
    expect(notTheme.state.selectedPath).toEqual([]);
    expect(invalid.state.selectedPath).toEqual([]);
  });

  it("completes with the final answer regardless of discovery order", () => {
    const answers = [
      ...testStrandsPuzzle.themeWords,
      testStrandsPuzzle.spangram,
    ];

    for (const orderedAnswers of [answers, [...answers].reverse()]) {
      let state = createInitialStrandsGameState();
      let finalStatus = "";

      for (const answer of orderedAnswers) {
        const result = submitAnswer(state, answer);
        state = result.state;
        finalStatus = result.status;
      }

      expect(finalStatus).toBe("game_complete");
      expect(getStrandsGameStatus(testStrandsPuzzle, state)).toBe("complete");
      expect(new Set(state.foundWords)).toEqual(
        new Set(answers.map(({ word }) => word)),
      );
    }
  });

  it("reports which final answer completed the game", () => {
    const finalAnswer = testStrandsPuzzle.spangram;
    const state: StrandsGameState = {
      selectedPath: [...finalAnswer.path],
      foundWords: testStrandsPuzzle.themeWords.map(({ word }) => word),
    };
    const result = submitStrandsPath(testStrandsPuzzle, state);

    expect(result).toMatchObject({
      status: "game_complete",
      completedBy: {
        word: finalAnswer.word,
        answerKind: "spangram",
      },
    });
  });

  it("creates a clean restart state without mutating progressed state", () => {
    const progressed: StrandsGameState = {
      selectedPath: [6, 7],
      foundWords: [testStrandsPuzzle.themeWords[0]!.word],
    };
    const cleared = clearStrandsPath(progressed);
    const restarted = createInitialStrandsGameState();

    expect(cleared).toEqual({
      selectedPath: [],
      foundWords: progressed.foundWords,
    });
    expect(restarted).toEqual({ selectedPath: [], foundWords: [] });
    expect(progressed.selectedPath).toEqual([6, 7]);
    expect(progressed.foundWords).toEqual([
      testStrandsPuzzle.themeWords[0]!.word,
    ]);
  });
});

function stateWithPath(selectedPath: number[]): StrandsGameState {
  return { selectedPath, foundWords: [] };
}

function submitAnswer(state: StrandsGameState, answer: StrandsAnswer) {
  return submitStrandsPath(testStrandsPuzzle, {
    ...state,
    selectedPath: [...answer.path],
  });
}
