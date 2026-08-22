import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeStoredWordlePuzzle,
  getWordlePuzzle,
  getWordlePuzzleForEvent,
  getWordlePuzzlePreview,
} from "@/content/wordle/getWordlePuzzle";

import { wedding01WordlePuzzle } from "../../../fixtures/wordle";

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
  id: "40000000-0000-4000-8000-000000000101",
  event_id: currentEvent.id,
  public_id: wedding01WordlePuzzle.id,
  answer: wedding01WordlePuzzle.answer,
};

describe("getWordlePuzzle", () => {
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

    const puzzle = await getWordlePuzzle("wedding-01");

    expect(puzzle).toEqual(wedding01WordlePuzzle);
    expect(mocks.from).toHaveBeenCalledWith("wordle_puzzles");
    expect(mocks.select).toHaveBeenCalledWith(
      "id, event_id, public_id, answer",
    );
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "public_id", "wedding-01");
  });

  it("returns null when the puzzle is absent from the configured Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const puzzle = await getWordlePuzzle("does-not-exist");

    expect(puzzle).toBeNull();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "public_id", "does-not-exist");
  });

  it("does not return a same-ID puzzle that is absent from the trusted Event", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const puzzle = await getWordlePuzzle("wedding-01");

    expect(puzzle).toBeNull();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "public_id", "wedding-01");
  });

  it("throws validation errors for malformed stored content", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...storedPuzzle, answer: "FOUR" },
      error: null,
    });

    await expect(getWordlePuzzle("wedding-01")).rejects.toThrow(
      'Wordle puzzle "wedding-01" failed validation: Puzzle answer must contain exactly 5 letters',
    );
  });

  it("throws a clear loading error when the database query fails", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("provider details"),
    });

    await expect(getWordlePuzzle("wedding-01")).rejects.toThrow(
      'Failed to load Wordle puzzle "wedding-01".',
    );
  });

  it("propagates current Event resolution failures without querying content", async () => {
    mocks.getCurrentEvent.mockRejectedValue(
      new Error("Configured Event is unavailable."),
    );

    await expect(getWordlePuzzle("wedding-01")).rejects.toThrow(
      "Configured Event is unavailable.",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("authoritative Wordle content boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentEvent.mockResolvedValue(currentEvent);
    mocks.getPrivilegedSupabaseClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  });

  it("loads a validated full puzzle through explicit Event scope", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: storedPuzzle, error: null });

    await expect(
      getWordlePuzzleForEvent(currentEvent.id, wedding01WordlePuzzle.id),
    ).resolves.toEqual({
      databaseId: storedPuzzle.id,
      eventId: currentEvent.id,
      puzzle: wedding01WordlePuzzle,
    });
    expect(mocks.getCurrentEvent).not.toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", currentEvent.id);
  });

  it("decodes and validates an embedded authoritative puzzle row", () => {
    expect(decodeStoredWordlePuzzle(storedPuzzle)).toEqual({
      databaseId: storedPuzzle.id,
      eventId: currentEvent.id,
      puzzle: wedding01WordlePuzzle,
    });
    expect(() =>
      decodeStoredWordlePuzzle({ ...storedPuzzle, answer: "NO" }),
    ).toThrow(
      'Wordle puzzle "wedding-01" failed validation: Puzzle answer must contain exactly 5 letters',
    );
  });

  it("projects only the public puzzle ID for the later route cutover", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { public_id: wedding01WordlePuzzle.id },
      error: null,
    });

    await expect(
      getWordlePuzzlePreview(wedding01WordlePuzzle.id),
    ).resolves.toEqual({ id: wedding01WordlePuzzle.id });
    expect(mocks.select).toHaveBeenCalledWith("public_id");
    expect(mocks.select).not.toHaveBeenCalledWith(
      expect.stringContaining("answer"),
    );
  });
});
