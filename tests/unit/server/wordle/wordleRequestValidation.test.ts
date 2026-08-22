import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isWordleAttemptId,
  parseStartWordleAttemptRequest,
  parseSubmitWordleGuessRequest,
} from "@/server/wordle/wordleRequestValidation";

describe("Wordle request validation", () => {
  it("parses resume/new starts and rejects malformed selectors", () => {
    expect(parseStartWordleAttemptRequest({ puzzleId: "wedding-01" })).toEqual({
      puzzleId: "wedding-01",
    });
    expect(
      parseStartWordleAttemptRequest({
        puzzleId: "wedding-01",
        startMode: "new",
      }),
    ).toEqual({ puzzleId: "wedding-01", startMode: "new" });
    expect(
      parseStartWordleAttemptRequest({
        puzzleId: "wedding-01",
        startMode: "discard",
      }),
    ).toBeNull();
    expect(parseStartWordleAttemptRequest({ puzzleId: "" })).toBeNull();
  });

  it("accepts only structural five-letter guesses and nonnegative versions", () => {
    expect(
      parseSubmitWordleGuessRequest({ guess: "CrAnE", version: 0 }),
    ).toEqual({ guess: "CrAnE", version: 0 });
    expect(
      parseSubmitWordleGuessRequest({ guess: "FOUR", version: 0 }),
    ).toBeNull();
    expect(
      parseSubmitWordleGuessRequest({ guess: "GU3SS", version: 0 }),
    ).toBeNull();
    expect(
      parseSubmitWordleGuessRequest({ guess: "CRANE", version: -1 }),
    ).toBeNull();
  });

  it("recognizes only UUID Attempt selectors", () => {
    expect(isWordleAttemptId("60000000-0000-4000-8000-000000000101")).toBe(
      true,
    );
    expect(isWordleAttemptId("not-an-attempt")).toBe(false);
  });
});
