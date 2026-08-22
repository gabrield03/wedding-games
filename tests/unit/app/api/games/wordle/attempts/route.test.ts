import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getCurrentPlayer: vi.fn(),
  startWordleAttempt: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/players/getCurrentPlayer", () => ({
  getCurrentPlayer: routeMocks.getCurrentPlayer,
}));
vi.mock("@/server/wordle/wordleAttempts", () => ({
  startWordleAttempt: routeMocks.startWordleAttempt,
}));

import { POST } from "@/app/api/games/wordle/attempts/route";

const player = {
  eventId: "00000000-0000-4000-8000-000000000001",
  id: "30000000-0000-4000-8000-000000000001",
};
const attempt = {
  attemptId: "60000000-0000-4000-8000-000000000101",
  gameStatus: "playing" as const,
  submittedGuesses: [],
  version: 0,
};

function request(body: unknown) {
  return new Request("http://localhost/api/games/wordle/attempts", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/games/wordle/attempts", () => {
  it("rejects malformed input before resolving a Player", async () => {
    const response = await POST(request({ puzzleId: "", startMode: "new" }));

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
    expect(routeMocks.startWordleAttempt).not.toHaveBeenCalled();
  });

  it("passes trusted Player and explicit lifecycle semantics to the service", async () => {
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startWordleAttempt.mockResolvedValue({
      status: "ready",
      attempt,
    });

    const defaultResponse = await POST(request({ puzzleId: "wedding-01" }));
    const newResponse = await POST(
      request({ puzzleId: "wedding-01", startMode: "new" }),
    );

    expect(defaultResponse.status).toBe(200);
    expect(await defaultResponse.json()).toEqual({ attempt });
    expect(newResponse.status).toBe(200);
    expect(routeMocks.startWordleAttempt).toHaveBeenNthCalledWith(1, {
      player,
      puzzleId: "wedding-01",
      startMode: "resume",
    });
    expect(routeMocks.startWordleAttempt).toHaveBeenNthCalledWith(2, {
      player,
      puzzleId: "wedding-01",
      startMode: "new",
    });
  });

  it("returns not found and fixed safe operational failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    routeMocks.getCurrentPlayer.mockResolvedValue({
      status: "resolved",
      player,
    });
    routeMocks.startWordleAttempt
      .mockResolvedValueOnce({ status: "not_found" })
      .mockRejectedValueOnce(new Error("sensitive database detail"));

    const missing = await POST(request({ puzzleId: "missing" }));
    const unavailable = await POST(request({ puzzleId: "wedding-01" }));

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: "wordle_resource_not_found",
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "wordle_gameplay_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith("Wordle Attempt start failed.");
  });
});
