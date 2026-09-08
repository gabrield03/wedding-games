import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  submitStrandsPath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/strands/strandsAttempts", () => ({
  submitStrandsPath: routeMocks.submitStrandsPath,
}));

import { POST } from "@/app/api/games/strands/attempts/[attemptId]/paths/route";

const attemptId = "60000000-0000-4000-8000-000000000301";
const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId,
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
  gameStatus: "playing" as const,
};
const path = [0, 1, 7, 6, 12, 13, 14, 19];

function request(body: unknown) {
  return new Request(
    `http://localhost/api/games/strands/attempts/${attemptId}/paths`,
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
  } as RouteContext<"/api/games/strands/attempts/[attemptId]/paths">;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/strands/attempts/[attemptId]/paths", () => {
  it("rejects malformed input before resolving a Player", async () => {
    const invalidId = await POST(
      request({ path, version: 0 }),
      context("not-an-attempt"),
    );
    const invalidPath = await POST(
      request({ path: [0, 48], version: 0 }),
      context(),
    );

    expect(invalidId.status).toBe(400);
    expect(invalidPath.status).toBe(400);
    expect(routeMocks.getCurrentPlayer).not.toHaveBeenCalled();
  });

  it("requires an authenticated, bootstrapped Player", async () => {
    routeMocks.getCurrentPlayer
      .mockResolvedValueOnce({ status: "unauthenticated" })
      .mockResolvedValueOnce({ status: "player_missing" });

    const unauthenticated = await POST(
      request({ path, version: 0 }),
      context(),
    );
    const missing = await POST(request({ path, version: 0 }), context());

    expect(unauthenticated.status).toBe(401);
    expect(missing.status).toBe(409);
    expect(routeMocks.submitStrandsPath).not.toHaveBeenCalled();
  });

  it("submits only the path, version, Attempt selector, and trusted Player", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitStrandsPath.mockResolvedValue({
      status: "submitted",
      outcome: "found_theme",
      attempt: { ...attempt, version: 1 },
    });

    const response = await POST(request({ path, version: 0 }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      outcome: "found_theme",
      attempt: { ...attempt, version: 1 },
    });
    expect(routeMocks.submitStrandsPath).toHaveBeenCalledWith({
      attemptId,
      player,
      path,
      version: 0,
    });
  });

  it("returns unchanged snapshots for ordinary non-answer outcomes", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitStrandsPath.mockResolvedValue({
      status: "submitted",
      outcome: "not_theme",
      attempt,
    });

    const response = await POST(request({ path, version: 0 }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      outcome: "not_theme",
      attempt,
    });
  });

  it("maps stale and terminal actions to conflicts with authoritative snapshots", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitStrandsPath
      .mockResolvedValueOnce({ status: "stale", attempt })
      .mockResolvedValueOnce({ status: "invalid_action", attempt });

    const stale = await POST(request({ path, version: 0 }), context());
    const terminal = await POST(request({ path, version: 0 }), context());

    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "stale_attempt", attempt });
    expect(terminal.status).toBe(409);
    expect(await terminal.json()).toEqual({ error: "invalid_action", attempt });
  });

  it("maps missing resources and operational failures safely", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitStrandsPath
      .mockResolvedValueOnce({ status: "not_found" })
      .mockRejectedValueOnce(new Error("sensitive provider detail"));

    const missing = await POST(request({ path, version: 0 }), context());
    const unavailable = await POST(request({ path, version: 0 }), context());

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: "strands_resource_not_found",
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "strands_gameplay_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Strands path submission failed.",
    );
  });
});
