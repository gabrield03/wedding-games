import { afterEach, describe, expect, it, vi } from "vitest";

const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import { ensureCurrentPlayer } from "@/server/players/ensureCurrentPlayer";

const input = {
  authUserId: "10000000-0000-4000-8000-000000000001",
  eventId: "00000000-0000-4000-8000-000000000001",
};
const player = {
  auth_user_id: input.authUserId,
  event_id: input.eventId,
  id: "30000000-0000-4000-8000-000000000001",
};

function mockPlayerQueries({
  insertError = null,
  selectError = null,
}: {
  insertError?: { message: string } | null;
  selectError?: { message: string } | null;
} = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: insertError });
  const single = vi.fn().mockResolvedValue({
    data: selectError ? null : player,
    error: selectError,
  });
  const secondEq = vi.fn(() => ({ single }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const select = vi.fn(() => ({ eq: firstEq }));
  const from = vi.fn(() => ({ select, upsert }));

  privilegedMocks.getClient.mockReturnValue({ from });

  return { firstEq, from, secondEq, select, single, upsert };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ensureCurrentPlayer", () => {
  it("uses conflict-ignore and returns the exact Event/Auth Player", async () => {
    const query = mockPlayerQueries();

    await expect(ensureCurrentPlayer(input)).resolves.toEqual(player);
    expect(query.upsert).toHaveBeenCalledWith(
      {
        auth_user_id: input.authUserId,
        event_id: input.eventId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "event_id,auth_user_id",
      },
    );
    expect(query.select).toHaveBeenCalledWith("id, event_id, auth_user_id");
    expect(query.firstEq).toHaveBeenCalledWith("event_id", input.eventId);
    expect(query.secondEq).toHaveBeenCalledWith(
      "auth_user_id",
      input.authUserId,
    );
  });

  it("is idempotent at the application boundary", async () => {
    const query = mockPlayerQueries();

    const first = await ensureCurrentPlayer(input);
    const second = await ensureCurrentPlayer(input);

    expect(first).toEqual(player);
    expect(second).toEqual(player);
    expect(query.upsert).toHaveBeenCalledTimes(2);
    expect(query.single).toHaveBeenCalledTimes(2);
  });

  it("fails when the conflict-safe insert fails", async () => {
    mockPlayerQueries({ insertError: { message: "insert failed" } });

    await expect(ensureCurrentPlayer(input)).rejects.toThrow(
      "Failed to create the current Player.",
    );
  });

  it("fails when the exact Player cannot be selected", async () => {
    mockPlayerQueries({ selectError: { message: "select failed" } });

    await expect(ensureCurrentPlayer(input)).rejects.toThrow(
      "Failed to resolve the current Player.",
    );
  });
});
