import { describe, expect, it } from "vitest";

import {
  clearMiniCrosswordCell,
  createInitialMiniCrosswordGameState,
  isMiniCrosswordBoardFilled,
  resetMiniCrosswordGame,
  setMiniCrosswordCellLetter,
  submitMiniCrossword,
} from "@/domain/miniCrossword/gameplay";
import type { MiniCrosswordGameState } from "@/domain/miniCrossword/types";
import { testMiniCrosswordPuzzle } from "../../../fixtures/miniCrossword";

describe("Mini Crossword gameplay", () => {
  it("creates an empty playing state for every grid cell", () => {
    expect(createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle)).toEqual(
      {
        letters: Array.from({ length: 25 }, () => null),
        status: "playing",
      },
    );
  });

  it("enters, normalizes, and replaces letters immutably", () => {
    const initialState = createInitialMiniCrosswordGameState(
      testMiniCrosswordPuzzle,
    );
    const cell = { row: 0, column: 2 };

    const withA = setMiniCrosswordCellLetter(
      testMiniCrosswordPuzzle,
      initialState,
      cell,
      "a",
    );
    const withB = setMiniCrosswordCellLetter(
      testMiniCrosswordPuzzle,
      withA,
      cell,
      "B",
    );

    expect(initialState.letters[2]).toBeNull();
    expect(withA.letters[2]).toBe("A");
    expect(withB.letters[2]).toBe("B");
    expect(withA).not.toBe(initialState);
    expect(withB).not.toBe(withA);
  });

  it("rejects malformed direct input and ignores blocked cells", () => {
    const state = createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle);

    expect(() =>
      setMiniCrosswordCellLetter(
        testMiniCrosswordPuzzle,
        state,
        { row: 0, column: 2 },
        "AB",
      ),
    ).toThrow("Letter must be a single ASCII alphabetic character");

    expect(
      setMiniCrosswordCellLetter(
        testMiniCrosswordPuzzle,
        state,
        { row: 0, column: 0 },
        "A",
      ),
    ).toBe(state);

    expect(() =>
      setMiniCrosswordCellLetter(
        testMiniCrosswordPuzzle,
        state,
        { row: 9, column: 9 },
        "A",
      ),
    ).toThrow("Cell must be within the Mini Crossword grid");
  });

  it("clears playable cells without mutating prior state", () => {
    const initialState = createInitialMiniCrosswordGameState(
      testMiniCrosswordPuzzle,
    );
    const cell = { row: 1, column: 1 };
    const filled = setMiniCrosswordCellLetter(
      testMiniCrosswordPuzzle,
      initialState,
      cell,
      "D",
    );
    const cleared = clearMiniCrosswordCell(
      testMiniCrosswordPuzzle,
      filled,
      cell,
    );

    expect(filled.letters[6]).toBe("D");
    expect(cleared.letters[6]).toBeNull();
    expect(cleared).not.toBe(filled);
    expect(
      clearMiniCrosswordCell(
        testMiniCrosswordPuzzle,
        cleared,
        { row: 0, column: 0 },
      ),
    ).toBe(cleared);
  });

  it("distinguishes an incomplete board from a fully filled board", () => {
    const initialState = createInitialMiniCrosswordGameState(
      testMiniCrosswordPuzzle,
    );

    expect(
      isMiniCrosswordBoardFilled(testMiniCrosswordPuzzle, initialState),
    ).toBe(false);

    const filled = fillFromSolution(initialState);

    expect(isMiniCrosswordBoardFilled(testMiniCrosswordPuzzle, filled)).toBe(
      true,
    );
  });

  it("returns incomplete without changing state", () => {
    const state = createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle);

    expect(submitMiniCrossword(testMiniCrosswordPuzzle, state)).toEqual({
      status: "incomplete",
      state,
    });
  });

  it("returns only an ambiguous incorrect result for a wrong full board", () => {
    const filled = fillFromSolution(
      createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle),
    );
    const incorrect = setMiniCrosswordCellLetter(
      testMiniCrosswordPuzzle,
      filled,
      { row: 0, column: 2 },
      "Z",
    );

    const result = submitMiniCrossword(testMiniCrosswordPuzzle, incorrect);

    expect(result).toEqual({
      status: "incorrect",
      state: incorrect,
    });
    expect(Object.keys(result).sort()).toEqual(["state", "status"]);
    expect(result.state.status).toBe("playing");
  });

  it("marks a correct submitted board complete and locks further edits", () => {
    const filled = fillFromSolution(
      createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle),
    );

    const result = submitMiniCrossword(testMiniCrosswordPuzzle, filled);

    expect(result.status).toBe("correct");
    expect(result.state.status).toBe("complete");
    expect(filled.status).toBe("playing");

    expect(
      setMiniCrosswordCellLetter(
        testMiniCrosswordPuzzle,
        result.state,
        { row: 0, column: 2 },
        "Z",
      ),
    ).toBe(result.state);
    expect(
      clearMiniCrosswordCell(
        testMiniCrosswordPuzzle,
        result.state,
        { row: 0, column: 2 },
      ),
    ).toBe(result.state);
  });

  it("resets completed gameplay to a fresh empty state", () => {
    const completed = submitMiniCrossword(
      testMiniCrosswordPuzzle,
      fillFromSolution(
        createInitialMiniCrosswordGameState(testMiniCrosswordPuzzle),
      ),
    ).state;

    expect(resetMiniCrosswordGame(testMiniCrosswordPuzzle)).toEqual({
      letters: Array.from({ length: 25 }, () => null),
      status: "playing",
    });
    expect(completed.status).toBe("complete");
  });
});

function fillFromSolution(
  startingState: MiniCrosswordGameState,
): MiniCrosswordGameState {
  let state = startingState;

  for (let row = 0; row < testMiniCrosswordPuzzle.grid.rows; row += 1) {
    for (
      let column = 0;
      column < testMiniCrosswordPuzzle.grid.columns;
      column += 1
    ) {
      const letter = testMiniCrosswordPuzzle.grid.solution[row]![column]!;

      if (letter === "#") {
        continue;
      }

      state = setMiniCrosswordCellLetter(
        testMiniCrosswordPuzzle,
        state,
        { row, column },
        letter,
      );
    }
  }

  return state;
}
