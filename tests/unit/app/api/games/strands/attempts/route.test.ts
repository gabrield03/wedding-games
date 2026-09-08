import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  startStrandsAttempt: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/strands/strandsAttempts", () => ({
  startStrandsAttempt: routeMocks.startStrandsAttempt,
}));

import { POST } from "@/app/api/games/strands/attempts/route";

const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId: "60000000-0000-4000-8000-000000000301",
  version: 0,
  puzzle: {
    id: "wedding-01",
    themeClue: "The Big Day",
    grid: {
      rows: 8,
      columns: 6,
      letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUV",
    },
    answerCount: 7,
  },
  foundAnswers: [],
  gameStatus: "playing" as const,
};

function request(body: unknown) {
  return new Request("http://localhost/api/games/strands/attempts", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/strands/attempts", () => {
  it("rejects malformed input before resolving a Player", async () => {
    const response = await POST(request({ puzzleId: "" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(routeMocks.getCurrentPlayer).not.toHaveBeenCalled();
  });

  it("requires an authenticated, bootstrapped Player", async () => {
    routeMocks.getCurrentPlayer
      .mockResolvedValueOnce({ status: "unauthenticated" })
      .mockResolvedValueOnce({ status: "player_missing" });

    const unauthenticated = await POST(request({ puzzleId: "wedding-01" }));
    const missing = await POST(request({ puzzleId: "wedding-01" }));

    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      error: "authenticated_player_required",
    });
    expect(missing.status).toBe(409);
    expect(await missing.json()).toEqual({ error: "player_not_ready" });
  });

  it("starts an Attempt with the trusted Player", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startStrandsAttempt.mockResolvedValue({
      status: "ready",
      attempt,
    });

    const response = await POST(request({ puzzleId: "wedding-01" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attempt });
    expect(routeMocks.startStrandsAttempt).toHaveBeenCalledWith({
      player,
      puzzleId: "wedding-01",
    });
  });

  it("returns safe not-found and operational failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startStrandsAttempt
      .mockResolvedValueOnce({ status: "not_found" })
      .mockRejectedValueOnce(new Error("sensitive detail"));

    const missing = await POST(request({ puzzleId: "missing" }));
    const unavailable = await POST(request({ puzzleId: "wedding-01" }));

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: "strands_resource_not_found",
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "strands_gameplay_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith("Strands Attempt start failed.");
  });
});
