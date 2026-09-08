import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  requestStrandsHint: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/strands/strandsAttempts", () => ({
  requestStrandsHint: routeMocks.requestStrandsHint,
}));

import { POST } from "@/app/api/games/strands/attempts/[attemptId]/hints/route";

const attemptId = "60000000-0000-4000-8000-000000000301";
const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId,
  version: 1,
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
  hintedTileIndexes: [0, 1, 6, 7, 12, 13, 14, 19],
  gameStatus: "playing" as const,
};

function request(body: unknown) {
  return new Request(
    `http://localhost/api/games/strands/attempts/${attemptId}/hints`,
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
  } as RouteContext<"/api/games/strands/attempts/[attemptId]/hints">;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/strands/attempts/[attemptId]/hints", () => {
  it("rejects malformed input before resolving a Player", async () => {
    const invalidId = await POST(
      request({ version: 0 }),
      context("not-an-attempt"),
    );
    const invalidVersion = await POST(request({ version: -1 }), context());

    expect(invalidId.status).toBe(400);
    expect(invalidVersion.status).toBe(400);
    expect(routeMocks.getCurrentPlayer).not.toHaveBeenCalled();
  });

  it("requires an authenticated, bootstrapped Player", async () => {
    routeMocks.getCurrentPlayer
      .mockResolvedValueOnce({ status: "unauthenticated" })
      .mockResolvedValueOnce({ status: "player_missing" });

    const unauthenticated = await POST(request({ version: 0 }), context());
    const missing = await POST(request({ version: 0 }), context());

    expect(unauthenticated.status).toBe(401);
    expect(missing.status).toBe(409);
    expect(routeMocks.requestStrandsHint).not.toHaveBeenCalled();
  });

  it("requests a hint with only trusted Player, Attempt, and version", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.requestStrandsHint.mockResolvedValue({
      status: "ready",
      attempt,
    });

    const response = await POST(request({ version: 0 }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attempt });
    expect(routeMocks.requestStrandsHint).toHaveBeenCalledWith({
      player,
      attemptId,
      version: 0,
    });
  });

  it("maps stale and unavailable hint actions to conflicts", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.requestStrandsHint
      .mockResolvedValueOnce({ status: "stale", attempt })
      .mockResolvedValueOnce({ status: "invalid_action", attempt });

    const stale = await POST(request({ version: 0 }), context());
    const unavailable = await POST(request({ version: 1 }), context());

    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "stale_attempt", attempt });
    expect(unavailable.status).toBe(409);
    expect(await unavailable.json()).toEqual({
      error: "invalid_action",
      attempt,
    });
  });

  it("maps missing resources and operational failures safely", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.requestStrandsHint
      .mockResolvedValueOnce({ status: "not_found" })
      .mockRejectedValueOnce(new Error("sensitive provider detail"));

    const missing = await POST(request({ version: 0 }), context());
    const unavailable = await POST(request({ version: 0 }), context());

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: "strands_resource_not_found",
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "strands_gameplay_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith("Strands hint request failed.");
  });
});
