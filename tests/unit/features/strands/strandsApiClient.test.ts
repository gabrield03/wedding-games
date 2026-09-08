import { afterEach, describe, expect, it, vi } from "vitest";

import type { StrandsAttemptSnapshot } from "@/contracts/strands";
import {
  requestStrandsAttempt,
  requestStrandsHint,
  requestStrandsPath,
} from "@/features/strands/strandsApiClient";

const attempt: StrandsAttemptSnapshot = {
  attemptId: "60000000-0000-4000-8000-000000000301",
  version: 0,
  puzzle: {
    id: "wedding-01",
    themeClue: "The Big Day",
    grid: {
      rows: 8,
      columns: 6,
      letters: "CEWRECERETPEMONDIOBYDIGNOUNEUSQUGVSTETDAEIVOWSYL",
    },
    answerCount: 7,
  },
  foundAnswers: [],
  hintedTileIndexes: null,
  gameStatus: "playing",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Strands API client", () => {
  it("starts or resumes an authoritative Attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ attempt }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestStrandsAttempt({ puzzleId: "wedding-01" }),
    ).resolves.toEqual({ status: "ready", attempt });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/strands/attempts",
      expect.objectContaining({
        body: JSON.stringify({ puzzleId: "wedding-01" }),
        credentials: "same-origin",
        method: "POST",
      }),
    );
  });

  it("submits only a completed path and authoritative version", async () => {
    const path = [0, 1, 7, 6, 12, 13, 14, 19];
    const nextAttempt: StrandsAttemptSnapshot = {
      ...attempt,
      version: 1,
      foundAnswers: [
        {
          word: "CEREMONY",
          kind: "theme",
          path,
          themeIndex: 0,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        outcome: "found_theme",
        attempt: nextAttempt,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestStrandsPath(attempt.attemptId, {
        path,
        version: 0,
      }),
    ).resolves.toEqual({
      status: "submitted",
      outcome: "found_theme",
      attempt: nextAttempt,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/strands/attempts/" + attempt.attemptId + "/paths",
      expect.objectContaining({
        body: JSON.stringify({ path, version: 0 }),
      }),
    );
  });

  it("requests hints and preserves authoritative snapshots on stale errors", async () => {
    const hinted: StrandsAttemptSnapshot = {
      ...attempt,
      version: 1,
      hintedTileIndexes: [0, 1, 6, 7, 12, 13, 14, 19],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ attempt: hinted }))
      .mockResolvedValueOnce(
        jsonResponse({ error: "stale_attempt", attempt: hinted }, 409),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestStrandsHint(attempt.attemptId, { version: 0 }),
    ).resolves.toEqual({ status: "ready", attempt: hinted });
    await expect(
      requestStrandsPath(attempt.attemptId, {
        path: [0, 1, 7, 6],
        version: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      error: "stale_attempt",
      attempt: hinted,
    });
  });

  it("rejects hidden or malformed gameplay snapshots", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          attempt: {
            ...attempt,
            foundAnswers: [
              {
                word: "CEREMONY",
                kind: "theme",
                path: [0, 1, 7, 6, 12, 13, 14, 19],
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          attempt: {
            ...attempt,
            hintedTileIndexes: [0, 0],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestStrandsAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Strands Attempt response was invalid.");
    await expect(
      requestStrandsAttempt({ puzzleId: "wedding-01" }),
    ).rejects.toThrow("Strands Attempt response was invalid.");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
