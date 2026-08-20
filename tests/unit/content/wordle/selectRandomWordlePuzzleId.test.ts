import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectRandomWordlePuzzleId } from "@/content/wordle/selectRandomWordlePuzzleId";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getCurrentEvent: vi.fn(),
  getPrivilegedSupabaseClient: vi.fn(),
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

function returnPuzzleIds(...puzzleIds: string[]) {
  mocks.eq.mockResolvedValue({
    data: puzzleIds.map((public_id) => ({ public_id })),
    error: null,
  });
}

describe("selectRandomWordlePuzzleId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mocks.getCurrentEvent.mockResolvedValue(currentEvent);
    mocks.getPrivilegedSupabaseClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
  });

  it("selects only public IDs belonging to the configured Event", async () => {
    returnPuzzleIds("wedding-01", "wedding-02");
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(selectRandomWordlePuzzleId()).resolves.toBe("wedding-01");
    expect(mocks.from).toHaveBeenCalledWith("wordle_puzzles");
    expect(mocks.select).toHaveBeenCalledWith("public_id");
    expect(mocks.eq).toHaveBeenCalledWith("event_id", currentEvent.id);
  });

  it("selects from all current-Event puzzles without an exclusion", async () => {
    returnPuzzleIds("wedding-01", "wedding-02", "wedding-03");
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    await expect(selectRandomWordlePuzzleId()).resolves.toBe("wedding-02");
  });

  it("excludes a matching puzzle when alternatives exist", async () => {
    returnPuzzleIds("wedding-01", "wedding-02", "wedding-03");
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(selectRandomWordlePuzzleId("wedding-01")).resolves.toBe(
      "wedding-02",
    );
  });

  it("reuses the excluded puzzle when it is the only available puzzle", async () => {
    returnPuzzleIds("wedding-01");
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(selectRandomWordlePuzzleId("wedding-01")).resolves.toBe(
      "wedding-01",
    );
  });

  it("ignores an exclusion that does not match an available puzzle", async () => {
    returnPuzzleIds("wedding-01", "wedding-02");
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(selectRandomWordlePuzzleId("does-not-exist")).resolves.toBe(
      "wedding-01",
    );
  });

  it("throws clearly when the configured Event has no Wordle puzzles", async () => {
    returnPuzzleIds();

    await expect(selectRandomWordlePuzzleId()).rejects.toThrow(
      'No Wordle puzzles are available for configured Event "current-wedding".',
    );
  });

  it("throws clearly when the database query fails", async () => {
    mocks.eq.mockResolvedValue({
      data: null,
      error: new Error("provider details"),
    });

    await expect(selectRandomWordlePuzzleId()).rejects.toThrow(
      'Failed to select a Wordle puzzle for configured Event "current-wedding".',
    );
  });

  it("propagates Event resolution failures without querying content", async () => {
    mocks.getCurrentEvent.mockRejectedValue(
      new Error("Configured Event is unavailable."),
    );

    await expect(selectRandomWordlePuzzleId()).rejects.toThrow(
      "Configured Event is unavailable.",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("retains no played history across calls", async () => {
    returnPuzzleIds("wedding-01", "wedding-02");
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(selectRandomWordlePuzzleId()).resolves.toBe("wedding-01");
    await expect(selectRandomWordlePuzzleId()).resolves.toBe("wedding-01");
    expect(mocks.eq).toHaveBeenCalledTimes(2);
  });
});
