import { afterEach, describe, expect, it, vi } from "vitest";

const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({
  entries: new Map<string, unknown>(),
  configuration: null as {
    keyParts: string[];
    options: { revalidate: number };
  } | null,
  unstableCache: vi.fn(
    <Arguments extends unknown[], Result>(
      callback: (...args: Arguments) => Promise<Result>,
      keyParts: string[],
      options: { revalidate: number },
    ) => {
      cacheMocks.configuration = { keyParts, options };

      return async (...args: Arguments): Promise<Result> => {
        const key = JSON.stringify(args);

        if (cacheMocks.entries.has(key)) {
          return cacheMocks.entries.get(key) as Result;
        }

        const value = await callback(...args);

        cacheMocks.entries.set(key, value);
        return value;
      };
    },
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: cacheMocks.unstableCache,
}));
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
  cacheMocks.entries.clear();

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
    expect(cacheMocks.configuration).toEqual({
      keyParts: ["current-event"],
      options: { revalidate: 300 },
    });
  });

  it("reuses a successful resolution for the same normalized slug", async () => {
    process.env.CURRENT_EVENT_SLUG = " current-wedding ";
    const query = mockEventQuery({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "current-wedding",
      },
      error: null,
    });

    await getCurrentEvent();
    process.env.CURRENT_EVENT_SLUG = "current-wedding";
    await getCurrentEvent();

    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not share cached values between different configured slugs", async () => {
    const query = mockEventQuery({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "first-wedding",
      },
      error: null,
    });
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "first-wedding",
      },
      error: null,
    });
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "00000000-0000-4000-8000-000000000002",
        slug: "second-wedding",
      },
      error: null,
    });

    process.env.CURRENT_EVENT_SLUG = "first-wedding";
    await expect(getCurrentEvent()).resolves.toMatchObject({
      slug: "first-wedding",
    });
    process.env.CURRENT_EVENT_SLUG = "second-wedding";
    await expect(getCurrentEvent()).resolves.toMatchObject({
      slug: "second-wedding",
    });

    expect(query.maybeSingle).toHaveBeenCalledTimes(2);
    expect(query.eq).toHaveBeenNthCalledWith(1, "slug", "first-wedding");
    expect(query.eq).toHaveBeenNthCalledWith(2, "slug", "second-wedding");
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
    const query = mockEventQuery({ data: null, error: null });
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "missing-event",
      },
      error: null,
    });

    await expect(getCurrentEvent()).rejects.toThrow(
      'Configured Event "missing-event" does not exist.',
    );
    await expect(getCurrentEvent()).resolves.toMatchObject({
      slug: "missing-event",
    });
    expect(query.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("wraps database failures without exposing them as successful resolution", async () => {
    process.env.CURRENT_EVENT_SLUG = "current-wedding";
    const query = mockEventQuery({
      data: null,
      error: { message: "database unavailable" },
    });
    query.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    });
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "current-wedding",
      },
      error: null,
    });

    await expect(getCurrentEvent()).rejects.toThrow(
      'Failed to resolve configured Event "current-wedding".',
    );
    await expect(getCurrentEvent()).resolves.toMatchObject({
      slug: "current-wedding",
    });
    expect(query.maybeSingle).toHaveBeenCalledTimes(2);
  });
});
