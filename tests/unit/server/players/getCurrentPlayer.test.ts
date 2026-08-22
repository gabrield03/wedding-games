import { afterEach, describe, expect, it, vi } from "vitest";

const requestMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));
const eventMocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createRequestSupabaseClient: requestMocks.createClient,
}));
vi.mock("@/server/events/getCurrentEvent", () => ({
  getCurrentEvent: eventMocks.getCurrentEvent,
}));

import { getCurrentPlayer } from "@/server/players/getCurrentPlayer";

const authUserId = "10000000-0000-4000-8000-000000000001";
const event = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "current-wedding",
};
const databasePlayer = {
  event_id: event.id,
  id: "30000000-0000-4000-8000-000000000001",
};

type PlayerQueryResult = {
  data: typeof databasePlayer | null;
  error: { message: string } | null;
};

function mockRequestClient({
  claimsError = null,
  claimsSubject = authUserId,
  playerResult = { data: databasePlayer, error: null },
}: {
  claimsError?: { message: string } | null;
  claimsSubject?: string | null;
  playerResult?: PlayerQueryResult;
} = {}) {
  const getClaims = vi.fn().mockResolvedValue({
    data: { claims: claimsSubject ? { sub: claimsSubject } : null },
    error: claimsError,
  });
  const maybeSingle = vi.fn().mockResolvedValue(playerResult);
  const secondEq = vi.fn(() => ({ maybeSingle }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const select = vi.fn(() => ({ eq: firstEq }));
  const from = vi.fn(() => ({ select }));

  requestMocks.createClient.mockResolvedValue({
    auth: { getClaims },
    from,
  });

  return { firstEq, from, getClaims, maybeSingle, secondEq, select };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentPlayer", () => {
  it("resolves the minimum Player identity for the authenticated request", async () => {
    eventMocks.getCurrentEvent.mockResolvedValue(event);
    const query = mockRequestClient();

    await expect(getCurrentPlayer()).resolves.toEqual({
      status: "resolved",
      player: {
        eventId: event.id,
        id: databasePlayer.id,
      },
    });
    expect(query.from).toHaveBeenCalledWith("players");
    expect(query.select).toHaveBeenCalledWith("id, event_id");
    expect(query.firstEq).toHaveBeenCalledWith("event_id", event.id);
    expect(query.secondEq).toHaveBeenCalledWith("auth_user_id", authUserId);
  });

  it("returns unauthenticated without resolving Event or Player", async () => {
    const query = mockRequestClient({ claimsSubject: null });

    await expect(getCurrentPlayer()).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(eventMocks.getCurrentEvent).not.toHaveBeenCalled();
    expect(query.from).not.toHaveBeenCalled();
  });

  it("treats an unverifiable claim as unauthenticated", async () => {
    const query = mockRequestClient();
    query.getClaims.mockRejectedValue(new Error("provider unavailable"));

    await expect(getCurrentPlayer()).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(eventMocks.getCurrentEvent).not.toHaveBeenCalled();
    expect(query.from).not.toHaveBeenCalled();
  });

  it("treats a claim verification error as unauthenticated", async () => {
    const query = mockRequestClient({
      claimsError: { message: "invalid token" },
    });

    await expect(getCurrentPlayer()).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(eventMocks.getCurrentEvent).not.toHaveBeenCalled();
    expect(query.from).not.toHaveBeenCalled();
  });

  it("returns player_missing when no Player matches the trusted scope", async () => {
    eventMocks.getCurrentEvent.mockResolvedValue(event);
    mockRequestClient({ playerResult: { data: null, error: null } });

    await expect(getCurrentPlayer()).resolves.toEqual({
      status: "player_missing",
    });
  });

  it("wraps Player query failures in a fixed safe error", async () => {
    eventMocks.getCurrentEvent.mockResolvedValue(event);
    mockRequestClient({
      playerResult: {
        data: null,
        error: { message: "sensitive provider detail" },
      },
    });

    await expect(getCurrentPlayer()).rejects.toThrow(
      "Failed to resolve the current Player.",
    );

    try {
      await getCurrentPlayer();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(
        "sensitive provider detail",
      );
    }
  });

  it("propagates Event resolution failures without querying Player", async () => {
    const query = mockRequestClient();
    eventMocks.getCurrentEvent.mockRejectedValue(
      new Error("CURRENT_EVENT_SLUG is not configured."),
    );

    await expect(getCurrentPlayer()).rejects.toThrow(
      "CURRENT_EVENT_SLUG is not configured.",
    );
    expect(query.from).not.toHaveBeenCalled();
  });
});
