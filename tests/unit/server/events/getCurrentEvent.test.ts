import { afterEach, describe, expect, it, vi } from "vitest";

const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import { getCurrentEvent } from "@/server/events/getCurrentEvent";

const originalCurrentEventSlug = process.env.CURRENT_EVENT_SLUG;

function mockEventQuery(result: {
  data: { id: string; slug: string } | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  privilegedMocks.getClient.mockReturnValue({ from });

  return { eq, from, maybeSingle, select };
}

afterEach(() => {
  vi.clearAllMocks();

  if (originalCurrentEventSlug === undefined) {
    delete process.env.CURRENT_EVENT_SLUG;
  } else {
    process.env.CURRENT_EVENT_SLUG = originalCurrentEventSlug;
  }
});

describe("getCurrentEvent", () => {
  it("resolves the configured Event with only its minimum fields", async () => {
    process.env.CURRENT_EVENT_SLUG = " current-wedding ";
    const query = mockEventQuery({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "current-wedding",
      },
      error: null,
    });

    await expect(getCurrentEvent()).resolves.toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      slug: "current-wedding",
    });
    expect(query.from).toHaveBeenCalledWith("events");
    expect(query.select).toHaveBeenCalledWith("id, slug");
    expect(query.eq).toHaveBeenCalledWith("slug", "current-wedding");
  });

  it("fails clearly when CURRENT_EVENT_SLUG is missing", async () => {
    delete process.env.CURRENT_EVENT_SLUG;

    await expect(getCurrentEvent()).rejects.toThrow(
      "CURRENT_EVENT_SLUG is not configured.",
    );
    expect(privilegedMocks.getClient).not.toHaveBeenCalled();
  });

  it("fails clearly when the configured Event does not exist", async () => {
    process.env.CURRENT_EVENT_SLUG = "missing-event";
    mockEventQuery({ data: null, error: null });

    await expect(getCurrentEvent()).rejects.toThrow(
      'Configured Event "missing-event" does not exist.',
    );
  });

  it("wraps database failures without exposing them as successful resolution", async () => {
    process.env.CURRENT_EVENT_SLUG = "current-wedding";
    mockEventQuery({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(getCurrentEvent()).rejects.toThrow(
      'Failed to resolve configured Event "current-wedding".',
    );
  });
});
