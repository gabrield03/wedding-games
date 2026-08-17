import { describe, expect, it } from "vitest";

import { evaluateWordleGuess } from "@/domain/wordle/gameplay";
import type {
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

describe("evaluateWordleGuess", () => {
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
