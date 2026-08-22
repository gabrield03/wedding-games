import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createRequestClient: vi.fn(),
  ensureCurrentPlayer: vi.fn(),
  getCurrentEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createRequestSupabaseClient: routeMocks.createRequestClient,
}));
vi.mock("@/server/events/getCurrentEvent", () => ({
  getCurrentEvent: routeMocks.getCurrentEvent,
}));
vi.mock("@/server/players/ensureCurrentPlayer", () => ({
  ensureCurrentPlayer: routeMocks.ensureCurrentPlayer,
}));

import { POST } from "@/app/api/player/bootstrap/route";

const authUserId = "10000000-0000-4000-8000-000000000001";
const event = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "current-wedding",
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mockClaims({
  error = null,
  sub = authUserId,
}: {
  error?: { message: string } | null;
  sub?: string | null;
} = {}) {
  const getClaims = vi.fn().mockResolvedValue({
    data: sub === null ? null : { claims: { sub } },
    error,
  });

  routeMocks.createRequestClient.mockResolvedValue({
    auth: { getClaims },
  });

  return getClaims;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/player/bootstrap", () => {
  it("uses verified claims and the trusted Event, then returns no IDs", async () => {
    mockClaims();
    routeMocks.getCurrentEvent.mockResolvedValue(event);
    routeMocks.ensureCurrentPlayer.mockResolvedValue({
      auth_user_id: authUserId,
      event_id: event.id,
      id: "30000000-0000-4000-8000-000000000001",
    });

    const response = await POST();

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("x-wedding-games-diagnostic-id")).toMatch(
      uuidPattern,
    );
    expect(routeMocks.ensureCurrentPlayer).toHaveBeenCalledWith({
      authUserId,
      eventId: event.id,
    });
  });

  it("returns 401 when verified claims do not contain an identity", async () => {
    mockClaims({ sub: null });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(routeMocks.getCurrentEvent).not.toHaveBeenCalled();
    expect(routeMocks.ensureCurrentPlayer).not.toHaveBeenCalled();
  });

  it("returns 401 when claim verification fails", async () => {
    mockClaims({ error: { message: "invalid token" }, sub: null });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(routeMocks.getCurrentEvent).not.toHaveBeenCalled();
  });

  it("returns a safe 503 for operational failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockClaims();
    routeMocks.getCurrentEvent.mockRejectedValue(
      new Error("database detail that must stay on the server"),
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "Player session setup is temporarily unavailable.",
    });
    expect(JSON.stringify(body)).not.toContain("database detail");
  });
});
