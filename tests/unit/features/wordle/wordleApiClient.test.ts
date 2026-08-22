import { afterEach, describe, expect, it, vi } from "vitest";

import type { WordleAttemptSnapshot } from "@/contracts/wordle";
import {
  requestWordleAttempt,
  requestWordleGuess,
} from "@/features/wordle/wordleApiClient";

const attempt: WordleAttemptSnapshot = {
  attemptId: "60000000-0000-4000-8000-000000000001",
  version: 0,
  submittedGuesses: [],
  gameStatus: "playing",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Wordle API client", () => {
  it("starts an Attempt with the explicit lifecycle mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ attempt }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01", startMode: "new" }),
    ).resolves.toEqual({ status: "ready", attempt });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/wordle/attempts",
      expect.objectContaining({
        body: JSON.stringify({
          puzzleId: "wedding-01",
          startMode: "new",
        }),
        credentials: "same-origin",
        method: "POST",
      }),
    );
  });

  it("submits only the typed guess and authoritative version", async () => {
    const nextAttempt: WordleAttemptSnapshot = {
      ...attempt,
      version: 1,
      submittedGuesses: [
        {
          guess: "CRANE",
          evaluation: [
            { letter: "C", status: "correct" },
            { letter: "R", status: "present" },
            { letter: "A", status: "absent" },
            { letter: "N", status: "absent" },
            { letter: "E", status: "correct" },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ attempt: nextAttempt }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWordleGuess(attempt.attemptId, {
        guess: "CRANE",
        version: 0,
      }),
    ).resolves.toEqual({ status: "submitted", attempt: nextAttempt });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/games/wordle/attempts/${attempt.attemptId}/guesses`,
      expect.objectContaining({
        body: JSON.stringify({ guess: "CRANE", version: 0 }),
      }),
    );
  });

  it("preserves authoritative snapshots on invalid-word and stale errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: "invalid_word", attempt }, 422),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "stale_attempt", attempt }, 409),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWordleGuess(attempt.attemptId, {
        guess: "QZXQZ",
        version: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      error: "invalid_word",
      attempt,
    });
    await expect(
      requestWordleGuess(attempt.attemptId, {
        guess: "CRANE",
        version: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      error: "stale_attempt",
      attempt,
    });
  });

  it("accepts a loss answer but rejects answer exposure in playing or won snapshots", async () => {
    const miss = {
      guess: "BLOAT",
      evaluation: [..."BLOAT"].map((letter) => ({
        letter,
        status: "absent" as const,
      })),
    };
    const loss: WordleAttemptSnapshot = {
      ...attempt,
      version: 6,
      submittedGuesses: Array.from({ length: 6 }, () => miss),
      gameStatus: "lost",
      revealedAnswer: "CRANE",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ attempt: loss }))
      .mockResolvedValueOnce(
        jsonResponse({ attempt: { ...attempt, revealedAnswer: "CRANE" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          attempt: {
            ...attempt,
            version: 1,
            submittedGuesses: [
              {
                guess: "CRANE",
                evaluation: [..."CRANE"].map((letter) => ({
                  letter,
                  status: "correct",
                })),
              },
            ],
            gameStatus: "won",
            revealedAnswer: "CRANE",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01" }),
    ).resolves.toEqual({ status: "ready", attempt: loss });
    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Wordle Attempt response was invalid.");
    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Wordle Attempt response was invalid.");
  });

  it("rejects malformed evaluation and error payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          attempt: {
            ...attempt,
            version: 1,
            submittedGuesses: [{ guess: "CRANE", evaluation: [] }],
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "provider_error" }, 503));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Wordle Attempt response was invalid.");
    await expect(
      requestWordleAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Wordle Attempt response was invalid.");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
