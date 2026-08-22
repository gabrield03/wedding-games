import { describe, expect, it } from "vitest";

import {
  addWordleLetter,
  createInitialWordleGameState,
  evaluateWordleGuess,
  getWordleGameStatus,
  normalizeWordleGuess,
  removeWordleLetter,
  submitWordleGuess,
  WORDLE_MAX_ATTEMPTS,
} from "@/domain/wordle/gameplay";
import type {
  WordleGameState,
  WordleLetterEvaluation,
  WordleLetterStatus,
} from "@/domain/wordle/types";

function expectEvaluation(
  answer: string,
  guess: string,
  statuses: WordleLetterStatus[],
  expectedLetters = guess.toUpperCase(),
): void {
  const expected: WordleLetterEvaluation[] = [...expectedLetters].map(
    (letter, index) => ({
      letter,
      status: statuses[index]!,
    }),
  );

  expect(evaluateWordleGuess(answer, guess)).toEqual(expected);
}

function enterGuess(state: WordleGameState, guess: string): WordleGameState {
  return [...guess].reduce(
    (nextState, letter) => addWordleLetter(nextState, letter),
    state,
  );
}

function submitCompleteGuess(
  state: WordleGameState,
  guess: string,
  answer = "CRANE",
): WordleGameState {
  const result = submitWordleGuess(answer, enterGuess(state, guess));

  expect(result.status).toBe("submitted");

  if (result.status !== "submitted") {
    throw new Error("Expected a submitted Wordle guess");
  }

  return result.state;
}

describe("evaluateWordleGuess", () => {
  it("normalizes structurally valid guesses through the shared domain helper", () => {
    expect(normalizeWordleGuess("cRaNe")).toBe("CRANE");
    expect(() => normalizeWordleGuess("GU3SS")).toThrow(
      "Guess must contain exactly 5 ASCII letters",
    );
  });

  it("marks every letter correct when the guess matches the answer", () => {
    expectEvaluation("CRANE", "CRANE", [
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("evaluates ordinary correct, present, and absent letters", () => {
    expectEvaluation("CRANE", "CREAM", [
      "correct",
      "correct",
      "present",
      "present",
      "absent",
    ]);
  });

  it("marks excess occurrences in the guess absent", () => {
    expectEvaluation("APPLE", "ALLEY", [
      "correct",
      "present",
      "absent",
      "present",
      "absent",
    ]);
  });

  it("allocates every available repeated letter in the answer once", () => {
    expectEvaluation("SHEEP", "EERIE", [
      "present",
      "present",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("can mark the same letter present, correct, and absent", () => {
    expectEvaluation("APPLE", "PUPPY", [
      "present",
      "absent",
      "correct",
      "absent",
      "absent",
    ]);
  });

  it("reserves exact matches before allocating misplaced duplicates", () => {
    expectEvaluation("APPLE", "PPPPP", [
      "absent",
      "correct",
      "correct",
      "absent",
      "absent",
    ]);
  });

  it("evaluates case-insensitively and returns uppercase letters", () => {
    expectEvaluation(
      "CrAnE",
      "cReAm",
      ["correct", "correct", "present", "present", "absent"],
      "CREAM",
    );
  });

  it.each(["TOO", "AB1DE"])("rejects the malformed answer %s", (answer) => {
    expect(() => evaluateWordleGuess(answer, "CRANE")).toThrow(
      "Answer must contain exactly 5 ASCII letters",
    );
  });

  it.each(["LONGER", "GU3SS"])("rejects the malformed guess %s", (guess) => {
    expect(() => evaluateWordleGuess("CRANE", guess)).toThrow(
      "Guess must contain exactly 5 ASCII letters",
    );
  });
});

describe("Wordle gameplay state", () => {
  it("creates a clean playing state", () => {
    const state = createInitialWordleGameState();

    expect(state).toEqual({
      currentGuess: "",
      submittedGuesses: [],
    });
    expect(getWordleGameStatus(state)).toBe("playing");
  });

  it("adds letters and normalizes them to uppercase", () => {
    const initialState = createInitialWordleGameState();
    const state = enterGuess(initialState, "cRa");

    expect(state.currentGuess).toBe("CRA");
    expect(initialState.currentGuess).toBe("");
  });

  it("does not add letters beyond the five-letter limit", () => {
    const fullState = enterGuess(createInitialWordleGameState(), "CRANE");

    const unchangedState = addWordleLetter(fullState, "S");

    expect(unchangedState).toBe(fullState);
    expect(unchangedState.currentGuess).toBe("CRANE");
  });

  it.each(["", "AB", "1", "é"])(
    "rejects malformed direct letter input %j",
    (letter) => {
      expect(() =>
        addWordleLetter(createInitialWordleGameState(), letter),
      ).toThrow("Letter must be a single ASCII alphabetic character");
    },
  );

  it("removes the final letter without mutating the previous state", () => {
    const previousState = enterGuess(createInitialWordleGameState(), "CR");

    const state = removeWordleLetter(previousState);

    expect(state.currentGuess).toBe("C");
    expect(previousState.currentGuess).toBe("CR");
  });

  it("leaves empty input unchanged when backspace is used", () => {
    const state = createInitialWordleGameState();

    expect(removeWordleLetter(state)).toBe(state);
  });

  it("rejects incomplete submission without changing state", () => {
    const state = enterGuess(createInitialWordleGameState(), "CRAN");

    const result = submitWordleGuess("CRANE", state);

    expect(result).toEqual({
      status: "incomplete",
      state,
    });
    expect(result.state).toBe(state);
  });

  it("stores the normalized guess and evaluation, then clears input", () => {
    const state = enterGuess(createInitialWordleGameState(), "cReAm");

    const result = submitWordleGuess("CRANE", state);

    expect(result.status).toBe("submitted");

    if (result.status !== "submitted") {
      throw new Error("Expected a submitted Wordle guess");
    }

    expect(result.state.currentGuess).toBe("");
    expect(result.state.submittedGuesses).toEqual([
      {
        guess: "CREAM",
        evaluation: evaluateWordleGuess("CRANE", "CREAM"),
      },
    ]);
    expect(state).toEqual({
      currentGuess: "CREAM",
      submittedGuesses: [],
    });
  });

  it("remains playing after five unsuccessful guesses", () => {
    let state = createInitialWordleGameState();

    for (let attempt = 0; attempt < WORDLE_MAX_ATTEMPTS - 1; attempt += 1) {
      state = submitCompleteGuess(state, "SLATE");
    }

    expect(state.submittedGuesses).toHaveLength(5);
    expect(getWordleGameStatus(state)).toBe("playing");
  });

  it("loses on the sixth unsuccessful guess", () => {
    let state = createInitialWordleGameState();

    for (let attempt = 0; attempt < WORDLE_MAX_ATTEMPTS; attempt += 1) {
      state = submitCompleteGuess(state, "SLATE");
    }

    expect(state.submittedGuesses).toHaveLength(WORDLE_MAX_ATTEMPTS);
    expect(getWordleGameStatus(state)).toBe("lost");
  });

  it("wins before the sixth attempt", () => {
    const state = submitCompleteGuess(createInitialWordleGameState(), "CRANE");

    expect(getWordleGameStatus(state)).toBe("won");
  });

  it("wins on the sixth attempt instead of losing", () => {
    let state = createInitialWordleGameState();

    for (let attempt = 0; attempt < WORDLE_MAX_ATTEMPTS - 1; attempt += 1) {
      state = submitCompleteGuess(state, "SLATE");
    }

    state = submitCompleteGuess(state, "CRANE");

    expect(state.submittedGuesses).toHaveLength(WORDLE_MAX_ATTEMPTS);
    expect(getWordleGameStatus(state)).toBe("won");
  });

  it("prevents editing and submission after a win", () => {
    const wonState = submitCompleteGuess(
      createInitialWordleGameState(),
      "CRANE",
    );

    expect(addWordleLetter(wonState, "A")).toBe(wonState);
    expect(removeWordleLetter(wonState)).toBe(wonState);
    expect(submitWordleGuess("CRANE", wonState)).toEqual({
      status: "game_over",
      state: wonState,
    });
  });

  it("prevents editing and submission after a loss", () => {
    let lostState = createInitialWordleGameState();

    for (let attempt = 0; attempt < WORDLE_MAX_ATTEMPTS; attempt += 1) {
      lostState = submitCompleteGuess(lostState, "SLATE");
    }

    expect(addWordleLetter(lostState, "A")).toBe(lostState);
    expect(removeWordleLetter(lostState)).toBe(lostState);
    expect(submitWordleGuess("CRANE", lostState)).toEqual({
      status: "game_over",
      state: lostState,
    });
  });

  it("creates a new clean state after another state has progressed", () => {
    const progressedState = submitCompleteGuess(
      createInitialWordleGameState(),
      "SLATE",
    );

    const newState = createInitialWordleGameState();

    expect(progressedState.submittedGuesses).toHaveLength(1);
    expect(newState).toEqual({
      currentGuess: "",
      submittedGuesses: [],
    });
    expect(newState).not.toBe(progressedState);
  });
});
