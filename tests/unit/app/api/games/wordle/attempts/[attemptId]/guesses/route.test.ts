import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  submitWordleGuess: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/wordle/wordleAttempts", () => ({
  submitWordleGuess: routeMocks.submitWordleGuess,
}));

import { POST } from "@/app/api/games/wordle/attempts/[attemptId]/guesses/route";

const attemptId = "60000000-0000-4000-8000-000000000101";
const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId,
  gameStatus: "playing" as const,
  submittedGuesses: [],
  version: 0,
};

function request(body: unknown) {
  return new Request(
    `http://localhost/api/games/wordle/attempts/${attemptId}/guesses`,
    {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
}

function context(id = attemptId) {
  return {
    params: Promise.resolve({ attemptId: id }),
  } as RouteContext<"/api/games/wordle/attempts/[attemptId]/guesses">;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/wordle/attempts/[attemptId]/guesses", () => {
  it("rejects malformed input before resolving a Player", async () => {
    const invalidId = await POST(
      request({ guess: "CRANE", version: 0 }),
      context("not-an-attempt"),
    );
    const invalidGuess = await POST(
      request({ guess: "FOUR", version: 0 }),
      context(),
    );

    expect(invalidId.status).toBe(400);
    expect(invalidGuess.status).toBe(400);
    expect(routeMocks.getCurrentPlayer).not.toHaveBeenCalled();
  });

  it("requires an authenticated, bootstrapped Player", async () => {
    routeMocks.getCurrentPlayer
      .mockResolvedValueOnce({ status: "unauthenticated" })
      .mockResolvedValueOnce({ status: "player_missing" });

    const unauthenticated = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );
    const missing = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );

    expect(unauthenticated.status).toBe(401);
    expect(missing.status).toBe(409);
    expect(routeMocks.submitWordleGuess).not.toHaveBeenCalled();
  });

  it("submits only the guess, version, Attempt selector, and trusted Player", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitWordleGuess.mockResolvedValue({
      status: "submitted",
      attempt: { ...attempt, version: 1 },
    });

    const response = await POST(
      request({ guess: "cRaNe", version: 0 }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      attempt: { ...attempt, version: 1 },
    });
    expect(routeMocks.submitWordleGuess).toHaveBeenCalledWith({
      attemptId,
      player,
      guess: "cRaNe",
      version: 0,
    });
  });

  it("returns invalid_word with the unchanged sanitized snapshot", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitWordleGuess.mockResolvedValue({
      status: "invalid_word",
      attempt,
    });

    const response = await POST(
      request({ guess: "QZXQZ", version: 0 }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ error: "invalid_word", attempt });
    expect(JSON.stringify(body)).not.toContain("accepted-guesses");
  });

  it("maps stale and terminal actions to conflicts with authoritative snapshots", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitWordleGuess
      .mockResolvedValueOnce({ status: "stale", attempt })
      .mockResolvedValueOnce({ status: "invalid_action", attempt });

    const stale = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );
    const terminal = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );

    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "stale_attempt", attempt });
    expect(terminal.status).toBe(409);
    expect(await terminal.json()).toEqual({ error: "invalid_action", attempt });
  });

  it("maps missing resources, service validation, and operational failures safely", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitWordleGuess
      .mockResolvedValueOnce({ status: "not_found" })
      .mockResolvedValueOnce({ status: "invalid_request" })
      .mockRejectedValueOnce(new Error("sensitive provider detail"));

    const missing = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );
    const invalid = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );
    const unavailable = await POST(
      request({ guess: "CRANE", version: 0 }),
      context(),
    );

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "wordle_gameplay_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Wordle guess submission failed.",
    );
  });
});
