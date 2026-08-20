import { beforeEach, describe, expect, it, vi } from "vitest";

import { getConnectionsPuzzle } from "@/content/connections/getConnectionsPuzzle";

import { developmentConnectionsPuzzle } from "../../../fixtures/connections";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getCurrentEvent: vi.fn(),
  getPrivilegedSupabaseClient: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/events/getCurrentEvent", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
}));

vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: mocks.getPrivilegedSupabaseClient,
}));

const currentEvent = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "current-wedding",
};

const storedPuzzle = {
  public_id: developmentConnectionsPuzzle.id,
  title: developmentConnectionsPuzzle.title,
  groups: developmentConnectionsPuzzle.groups,
};

describe("getConnectionsPuzzle", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentEvent.mockResolvedValue(currentEvent);
    mocks.getPrivilegedSupabaseClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  });

  it("returns a validated puzzle from the configured Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: storedPuzzle, error: null });

    const puzzle = await getConnectionsPuzzle("development-puzzle");

    expect(puzzle).toEqual(developmentConnectionsPuzzle);
    expect(mocks.from).toHaveBeenCalledWith("connections_puzzles");
    expect(mocks.select).toHaveBeenCalledWith("public_id, title, groups");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(
      2,
      "public_id",
      "development-puzzle",
    );
  });

  it("returns null only when the puzzle is absent from the configured Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const puzzle = await getConnectionsPuzzle("does-not-exist");

    expect(puzzle).toBeNull();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "public_id", "does-not-exist");
  });

  it("throws a clear error when stored JSON has the wrong shape", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...storedPuzzle, groups: [{ id: "group-without-tiles" }] },
      error: null,
    });

    await expect(getConnectionsPuzzle("development-puzzle")).rejects.toThrow(
      'Connections puzzle "development-puzzle" has invalid stored content: group 1 must have string id and category values.',
    );
  });

  it("does not return a same-ID puzzle that is absent from the trusted Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const puzzle = await getConnectionsPuzzle("development-puzzle");

    expect(puzzle).toBeNull();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(
      2,
      "public_id",
      "development-puzzle",
    );
  });

  it("throws validation errors for structurally decoded invalid content", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...storedPuzzle, groups: [] },
      error: null,
    });

    await expect(getConnectionsPuzzle("development-puzzle")).rejects.toThrow(
      'Connections puzzle "development-puzzle" failed validation: Puzzle must contain exactly 4 groups',
    );
  });

  it("throws a clear loading error when the database query fails", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("provider details"),
    });

    await expect(getConnectionsPuzzle("development-puzzle")).rejects.toThrow(
      'Failed to load Connections puzzle "development-puzzle".',
    );
  });

  it("propagates current Event resolution failures without querying content", async () => {
    mocks.getCurrentEvent.mockRejectedValue(
      new Error("Configured Event is unavailable."),
    );

    await expect(getConnectionsPuzzle("development-puzzle")).rejects.toThrow(
      "Configured Event is unavailable.",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
