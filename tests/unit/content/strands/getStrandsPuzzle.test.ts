import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeStoredStrandsPuzzle,
  getStrandsPuzzle,
  getStrandsPuzzleForEvent,
  getStrandsPuzzlePreview,
  type StoredStrandsPuzzleRow,
} from "@/content/strands/getStrandsPuzzle";
import type { Json } from "@/types/database.generated";
import { testStrandsPuzzle } from "../../../fixtures/strands";

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

const eventId = "00000000-0000-4000-8000-000000000001";
const puzzleDatabaseId = "40000000-0000-4000-8000-000000000301";

function storedPuzzleRow(
  overrides: Partial<StoredStrandsPuzzleRow> = {},
): StoredStrandsPuzzleRow {
  return {
    event_id: eventId,
    grid_columns: testStrandsPuzzle.grid.columns,
    grid_letters: testStrandsPuzzle.grid.letters,
    grid_rows: testStrandsPuzzle.grid.rows,
    id: puzzleDatabaseId,
    public_id: testStrandsPuzzle.id,
    spangram: structuredClone(testStrandsPuzzle.spangram) as Json,
    theme_clue: testStrandsPuzzle.themeClue,
    theme_words: structuredClone(testStrandsPuzzle.themeWords) as Json,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getCurrentEvent.mockResolvedValue({
    id: eventId,
    slug: "current-wedding",
  });
  mocks.getPrivilegedSupabaseClient.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
});

describe("Strands puzzle persistence", () => {
  it("loads and validates a puzzle from the trusted Event", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: storedPuzzleRow(),
      error: null,
    });

    await expect(getStrandsPuzzle(testStrandsPuzzle.id)).resolves.toEqual(
      testStrandsPuzzle,
    );

    expect(mocks.from).toHaveBeenCalledWith("strands_puzzles");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "event_id", eventId);
    expect(mocks.eq).toHaveBeenNthCalledWith(
      2,
      "public_id",
      testStrandsPuzzle.id,
    );
  });

  it("loads a sanitized public preview without returning hidden answers", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: storedPuzzleRow(),
      error: null,
    });

    const preview = await getStrandsPuzzlePreview(testStrandsPuzzle.id);

    expect(preview).toEqual({
      id: testStrandsPuzzle.id,
      themeClue: testStrandsPuzzle.themeClue,
      grid: testStrandsPuzzle.grid,
      answerCount: testStrandsPuzzle.themeWords.length + 1,
    });
    expect(preview).not.toHaveProperty("themeWords");
    expect(preview).not.toHaveProperty("spangram");
  });

  it("supports explicit Event-scoped loading for authoritative gameplay", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: storedPuzzleRow(),
      error: null,
    });

    await expect(
      getStrandsPuzzleForEvent(eventId, testStrandsPuzzle.id),
    ).resolves.toEqual({
      databaseId: puzzleDatabaseId,
      eventId,
      puzzle: testStrandsPuzzle,
    });

    expect(mocks.getCurrentEvent).not.toHaveBeenCalled();
  });

  it("returns null for a missing puzzle and throws for malformed stored content", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      getStrandsPuzzleForEvent(eventId, "missing"),
    ).resolves.toBeNull();

    expect(() =>
      decodeStoredStrandsPuzzle(
        storedPuzzleRow({
          grid_letters: "BAD",
        }),
      ),
    ).toThrow(/failed validation/i);
  });

  it("rejects malformed stored answer JSON before gameplay uses it", () => {
    expect(() =>
      decodeStoredStrandsPuzzle(
        storedPuzzleRow({
          theme_words: [{ word: "ABCDEF", path: ["bad"] }] as Json,
        }),
      ),
    ).toThrow(/invalid stored theme words entry 1/i);
  });

  it("surfaces database loading failures without exposing provider details", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("provider detail"),
    });

    await expect(
      getStrandsPuzzleForEvent(eventId, testStrandsPuzzle.id),
    ).rejects.toThrow(
      `Failed to load Strands puzzle "${testStrandsPuzzle.id}".`,
    );
  });
});
