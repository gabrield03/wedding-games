import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  startConnectionsAttempt: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/connections/connectionsAttempts", () => ({
  startConnectionsAttempt: routeMocks.startConnectionsAttempt,
}));

import { POST } from "@/app/api/games/connections/attempts/route";

const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId: "60000000-0000-4000-8000-000000000001",
  displayedGroups: [],
  gameStatus: "playing" as const,
  mistakesRemaining: 4,
  remainingTiles: [{ id: "50000000-0000-4000-8000-000000000001", label: "A" }],
  version: 0,
};

function request(body: unknown) {
  return new Request("http://localhost/api/games/connections/attempts", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/connections/attempts", () => {
  it("requires an authenticated Player before parsing or starting", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "unauthenticated",
    });

    const response = await POST(request({ puzzleId: "development-puzzle" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "authenticated_player_required",
    });
    expect(routeMocks.startConnectionsAttempt).not.toHaveBeenCalled();
  });

  it("reports an authenticated user whose Player bootstrap is not ready", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({ status: "player_missing" });

    const response = await POST(request({ puzzleId: "development-puzzle" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "player_not_ready" });
    expect(routeMocks.startConnectionsAttempt).not.toHaveBeenCalled();
  });

  it("rejects malformed input without calling the service", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });

    const response = await POST(request({ puzzleId: "" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(routeMocks.startConnectionsAttempt).not.toHaveBeenCalled();
  });

  it("passes only validated input and the trusted Player to the service", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startConnectionsAttempt.mockResolvedValue({
      attempt,
      status: "ready",
    });

    const response = await POST(
      request({
        puzzleId: "development-puzzle",
        replayFromAttemptId: "60000000-0000-4000-8000-000000000002",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attempt });
    expect(routeMocks.startConnectionsAttempt).toHaveBeenCalledWith({
      player,
      puzzleId: "development-puzzle",
      replayFromAttemptId: "60000000-0000-4000-8000-000000000002",
    });
  });

  it("distinguishes an unknown puzzle from an incomplete replay source", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startConnectionsAttempt
      .mockResolvedValueOnce({ status: "not_found" })
      .mockResolvedValueOnce({
        attempt,
        status: "replay_not_complete",
      });

    const missingResponse = await POST(request({ puzzleId: "missing" }));
    const replayResponse = await POST(
      request({
        puzzleId: "development-puzzle",
        replayFromAttemptId: attempt.attemptId,
      }),
    );

    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      error: "connections_resource_not_found",
    });
    expect(replayResponse.status).toBe(409);
    expect(await replayResponse.json()).toEqual({
      attempt,
      error: "attempt_not_complete",
    });
  });

  it("returns a fixed safe response for operational failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startConnectionsAttempt.mockRejectedValue(
      new Error("sensitive provider detail"),
    );

    const response = await POST(request({ puzzleId: "development-puzzle" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "connections_gameplay_unavailable" });
    expect(JSON.stringify(body)).not.toContain("sensitive provider detail");
    expect(consoleError).toHaveBeenCalledWith(
      "Connections Attempt start failed.",
    );
  });
});
