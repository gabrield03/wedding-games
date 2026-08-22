import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConnectionsAttemptSnapshot } from "@/contracts/connections";
import {
  requestConnectionsAttempt,
  requestConnectionsGuess,
} from "@/features/connections/connectionsApiClient";

const attempt: ConnectionsAttemptSnapshot = {
  attemptId: "60000000-0000-4000-8000-000000000001",
  version: 0,
  remainingTiles: [{ id: "50000000-0000-4000-8000-000000000001", label: "A" }],
  displayedGroups: [],
  mistakesRemaining: 4,
  gameStatus: "playing",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Connections API client", () => {
  it("starts or resumes an Attempt through the Connections endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ attempt }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestConnectionsAttempt({ puzzleId: "development-puzzle" }),
    ).resolves.toEqual({ status: "ready", attempt });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/connections/attempts",
      expect.objectContaining({
        body: JSON.stringify({ puzzleId: "development-puzzle" }),
        method: "POST",
      }),
    );
  });

  it("submits opaque tokens and the authoritative version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        outcome: "incorrect",
        attempt: { ...attempt, version: 1 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const tileIds = [
      "50000000-0000-4000-8000-000000000001",
      "50000000-0000-4000-8000-000000000002",
      "50000000-0000-4000-8000-000000000003",
      "50000000-0000-4000-8000-000000000004",
    ];

    await expect(
      requestConnectionsGuess(attempt.attemptId, { tileIds, version: 0 }),
    ).resolves.toMatchObject({ status: "submitted", outcome: "incorrect" });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/games/connections/attempts/${attempt.attemptId}/guesses`,
      expect.objectContaining({
        body: JSON.stringify({ tileIds, version: 0 }),
      }),
    );
  });

  it("preserves a supplied authoritative snapshot on gameplay errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: "stale_attempt", attempt }, 409),
        ),
    );

    await expect(
      requestConnectionsGuess(attempt.attemptId, {
        tileIds: [],
        version: 0,
      }),
    ).resolves.toEqual({ status: "error", error: "stale_attempt", attempt });
  });

  it("rejects malformed responses rather than treating them as gameplay state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ attempt: {} })),
    );

    await expect(
      requestConnectionsAttempt({ puzzleId: "development-puzzle" }),
    ).rejects.toThrow("Connections Attempt response was invalid.");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
