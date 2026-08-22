import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAcceptedWordleGuess } from "@/server/wordle/acceptedGuesses";

describe("isAcceptedWordleGuess", () => {
  it("accepts common five-letter words with case-normalized membership", () => {
    expect(isAcceptedWordleGuess("CRANE")).toBe(true);
    expect(isAcceptedWordleGuess("crane")).toBe(true);
  });

  it("rejects structurally plausible nonsense absent from the dictionary", () => {
    expect(isAcceptedWordleGuess("QZXQZ")).toBe(false);
  });
});
