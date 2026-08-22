import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  submitConnectionsGuess: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/connections/connectionsAttempts", () => ({
  submitConnectionsGuess: routeMocks.submitConnectionsGuess,
}));

import { POST } from "@/app/api/games/connections/attempts/[attemptId]/guesses/route";

const attemptId = "60000000-0000-4000-8000-000000000001";
const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const tileIds = [1, 2, 3, 4].map(
  (value) => `50000000-0000-4000-8000-${String(value).padStart(12, "0")}`,
);
const attempt = {
  attemptId,
  displayedGroups: [],
  gameStatus: "playing" as const,
  mistakesRemaining: 3,
  remainingTiles: tileIds.map((id, index) => ({ id, label: String(index) })),
  version: 1,
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function request(body: unknown) {
  return new Request(
    `http://localhost/api/games/connections/attempts/${attemptId}/guesses`,
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
  } as RouteContext<"/api/games/connections/attempts/[attemptId]/guesses">;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/connections/attempts/[attemptId]/guesses", () => {
  it("requires an authenticated Player before validating the request", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "unauthenticated",
    });

    const response = await POST(request({ tileIds, version: 0 }), context());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "authenticated_player_required",
    });
    expect(routeMocks.submitConnectionsGuess).not.toHaveBeenCalled();
  });

  it("reports an authenticated user whose Player bootstrap is not ready", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({ status: "player_missing" });

    const response = await POST(request({ tileIds, version: 0 }), context());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "player_not_ready" });
  });

  it("rejects malformed IDs and guesses without calling the service", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });

    const invalidAttempt = await POST(
      request({ tileIds, version: 0 }),
      context("not-an-attempt"),
    );
    const invalidGuess = await POST(
      request({ tileIds: tileIds.slice(0, 3), version: 0 }),
      context(),
    );

    expect(invalidAttempt.status).toBe(400);
    expect(invalidGuess.status).toBe(400);
    expect(routeMocks.submitConnectionsGuess).not.toHaveBeenCalled();
  });

  it("passes opaque tile IDs, the version, and trusted Player to the service", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitConnectionsGuess.mockResolvedValue({
      attempt,
      outcome: "one_away",
      status: "submitted",
    });

    const response = await POST(request({ tileIds, version: 0 }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attempt, outcome: "one_away" });
    expect(response.headers.get("x-wedding-games-diagnostic-id")).toMatch(
      uuidPattern,
    );
    expect(routeMocks.submitConnectionsGuess).toHaveBeenCalledWith({
      attemptId,
      player,
      tileIds,
      version: 0,
    });
  });

  it("maps stale and invalid actions to conflicts with the current snapshot", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitConnectionsGuess
      .mockResolvedValueOnce({ attempt, status: "stale" })
      .mockResolvedValueOnce({ attempt, status: "invalid_action" });

    const staleResponse = await POST(
      request({ tileIds, version: 0 }),
      context(),
    );
    const actionResponse = await POST(
      request({ tileIds, version: 1 }),
      context(),
    );

    expect(staleResponse.status).toBe(409);
    expect(await staleResponse.json()).toEqual({
      attempt,
      error: "stale_attempt",
    });
    expect(actionResponse.status).toBe(409);
    expect(await actionResponse.json()).toEqual({
      attempt,
      error: "invalid_action",
    });
  });

  it("maps unknown resources and invalid mapped selections distinctly", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitConnectionsGuess
      .mockResolvedValueOnce({ status: "not_found" })
      .mockResolvedValueOnce({ status: "invalid_request" });

    const missingResponse = await POST(
      request({ tileIds, version: 0 }),
      context(),
    );
    const invalidResponse = await POST(
      request({ tileIds, version: 0 }),
      context(),
    );

    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      error: "connections_resource_not_found",
    });
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({ error: "invalid_request" });
  });

  it("returns a fixed safe response for operational failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.submitConnectionsGuess.mockRejectedValue(
      new Error("sensitive database detail"),
    );

    const response = await POST(request({ tileIds, version: 0 }), context());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "connections_gameplay_unavailable" });
    expect(JSON.stringify(body)).not.toContain("sensitive database detail");
    expect(consoleError).toHaveBeenCalledWith(
      "Connections guess submission failed.",
    );
  });
});
