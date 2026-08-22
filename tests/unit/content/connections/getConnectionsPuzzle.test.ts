import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeStoredConnectionsPuzzle,
  getConnectionsPuzzleForEvent,
  getConnectionsPuzzlePreview,
} from "@/content/connections/getConnectionsPuzzle";

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
  event_id: currentEvent.id,
  id: "40000000-0000-4000-8000-000000000001",
  public_id: developmentConnectionsPuzzle.id,
  title: developmentConnectionsPuzzle.title,
  groups: developmentConnectionsPuzzle.groups,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentEvent.mockResolvedValue(currentEvent);
  mocks.getPrivilegedSupabaseClient.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
});

describe("getConnectionsPuzzlePreview", () => {
  it("returns only the title and public ID from the configured Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: storedPuzzle, error: null });

    const preview = await getConnectionsPuzzlePreview("development-puzzle");

    expect(preview).toEqual({
      id: developmentConnectionsPuzzle.id,
      title: developmentConnectionsPuzzle.title,
    });
    expect(mocks.from).toHaveBeenCalledWith("connections_puzzles");
    expect(mocks.select).toHaveBeenCalledWith("public_id, title");
    expect(mocks.select).not.toHaveBeenCalledWith(
      expect.stringContaining("groups"),
    );
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(
      2,
      "public_id",
      "development-puzzle",
    );
  });

  it("returns null for an unknown puzzle in the configured Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      getConnectionsPuzzlePreview("does-not-exist"),
    ).resolves.toBeNull();
  });

  it("rejects malformed public content", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...storedPuzzle, title: " " },
      error: null,
    });

    await expect(
      getConnectionsPuzzlePreview("development-puzzle"),
    ).rejects.toThrow(
      'Connections puzzle "development-puzzle" has invalid public content.',
    );
  });

  it("keeps database and Event resolution failures operational", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("provider detail"),
    });

    await expect(
      getConnectionsPuzzlePreview("development-puzzle"),
    ).rejects.toThrow(
      'Failed to load Connections puzzle "development-puzzle".',
    );

    mocks.getCurrentEvent.mockRejectedValue(
      new Error("Configured Event is unavailable."),
    );

    await expect(
      getConnectionsPuzzlePreview("development-puzzle"),
    ).rejects.toThrow("Configured Event is unavailable.");
  });
});

describe("getConnectionsPuzzleForEvent", () => {
  it("keeps the complete validated puzzle inside the authoritative server boundary", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: storedPuzzle, error: null });

    const stored = await getConnectionsPuzzleForEvent(
      currentEvent.id,
      "development-puzzle",
    );

    expect(stored).toEqual({
      databaseId: storedPuzzle.id,
      eventId: currentEvent.id,
      puzzle: developmentConnectionsPuzzle,
    });
    expect(mocks.select).toHaveBeenCalledWith(
      "id, event_id, public_id, title, groups",
    );
  });

  it("validates and safely reports malformed stored solution data", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { ...storedPuzzle, groups: [{ id: "group-without-tiles" }] },
      error: null,
    });

    await expect(
      getConnectionsPuzzleForEvent(currentEvent.id, "development-puzzle"),
    ).rejects.toThrow(
      'Connections puzzle "development-puzzle" has invalid stored content: group 1 must have string id and category values.',
    );

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { ...storedPuzzle, groups: [] },
      error: null,
    });

    await expect(
      getConnectionsPuzzleForEvent(currentEvent.id, "development-puzzle"),
    ).rejects.toThrow(
      'Connections puzzle "development-puzzle" failed validation: Puzzle must contain exactly 4 groups',
    );
  });

  it("returns null for a missing scoped row and throws on query failure", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      getConnectionsPuzzleForEvent(currentEvent.id, "does-not-exist"),
    ).resolves.toBeNull();

    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("provider detail"),
    });

    await expect(
      getConnectionsPuzzleForEvent(currentEvent.id, "development-puzzle"),
    ).rejects.toThrow(
      'Failed to load Connections puzzle "development-puzzle".',
    );
  });
});

describe("decodeStoredConnectionsPuzzle", () => {
  it("decodes and validates a row already loaded by an authoritative service", () => {
    expect(decodeStoredConnectionsPuzzle(storedPuzzle)).toEqual({
      databaseId: storedPuzzle.id,
      eventId: currentEvent.id,
      puzzle: developmentConnectionsPuzzle,
    });
  });

  it("rejects malformed embedded stored content", () => {
    expect(() =>
      decodeStoredConnectionsPuzzle({ ...storedPuzzle, groups: [] }),
    ).toThrow(
      'Connections puzzle "development-puzzle" failed validation: Puzzle must contain exactly 4 groups',
    );
  });
});
