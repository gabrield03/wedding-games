import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredStrandsPuzzle } from "@/content/strands/getStrandsPuzzle";
import type { Tables } from "@/types/database.generated";
import { testStrandsPuzzle } from "../../../fixtures/strands";

const contentMocks = vi.hoisted(() => ({
  getForEvent: vi.fn(),
}));
const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/content/strands/getStrandsPuzzle", () => ({
  getStrandsPuzzleForEvent: contentMocks.getForEvent,
}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import { startStrandsAttempt } from "@/server/strands/strandsAttempts";

type AttemptRow = Tables<"strands_attempts">;
type AttemptInsert = {
  event_id: string;
  player_id: string;
  puzzle_id: string;
};

const eventId = "00000000-0000-4000-8000-000000000001";
const playerId = "30000000-0000-4000-8000-000000000001";
const puzzleDatabaseId = "40000000-0000-4000-8000-000000000301";
const attemptId = "60000000-0000-4000-8000-000000000301";
const player = { eventId, id: playerId };

const storedPuzzle: StoredStrandsPuzzle = {
  databaseId: puzzleDatabaseId,
  eventId,
  puzzle: testStrandsPuzzle,
};

function attemptRow(overrides: Partial<AttemptRow> = {}): AttemptRow {
  return {
    completed_at: null,
    created_at: "2026-09-08T02:00:00.000Z",
    event_id: eventId,
    found_words: [],
    id: attemptId,
    player_id: playerId,
    puzzle_id: puzzleDatabaseId,
    updated_at: "2026-09-08T02:00:00.000Z",
    version: 0,
    ...overrides,
  };
}

class FakeAttemptStore {
  attempts: AttemptRow[];
  insertRaceAttempt: AttemptRow | null = null;
  nextAttemptId = "60000000-0000-4000-8000-000000000399";

  constructor(attempts: AttemptRow[] = []) {
    this.attempts = attempts;
  }

  client() {
    return {
      from: (table: string) => {
        expect(table).toBe("strands_attempts");

        return {
          insert: (value: AttemptInsert) => new FakeInsertQuery(this, value),
          select: () => new FakeSelectQuery(this),
        };
      },
    };
  }
}

class FakeSelectQuery {
  private filters: Array<[keyof AttemptRow, unknown]> = [];
  private activeOnly = false;

  constructor(private readonly store: FakeAttemptStore) {}

  eq(key: keyof AttemptRow, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }

  is(key: keyof AttemptRow, value: null) {
    expect(key).toBe("completed_at");
    expect(value).toBeNull();
    this.activeOnly = true;
    return this;
  }

  async maybeSingle() {
    const attempt = this.store.attempts.find(
      (row) =>
        this.filters.every(([key, value]) => row[key] === value) &&
        (!this.activeOnly || row.completed_at === null),
    );

    return { data: attempt ?? null, error: null };
  }
}

class FakeInsertQuery {
  constructor(
    private readonly store: FakeAttemptStore,
    private readonly value: AttemptInsert,
  ) {}

  select() {
    return this;
  }

  async single() {
    if (this.store.insertRaceAttempt) {
      this.store.attempts.push(this.store.insertRaceAttempt);
      this.store.insertRaceAttempt = null;

      return {
        data: null,
        error: {
          code: "23505",
          details: "strands_attempts_one_active_per_player_puzzle_idx conflict",
          message:
            'duplicate key violates "strands_attempts_one_active_per_player_puzzle_idx"',
        },
      };
    }

    const row = attemptRow({
      event_id: this.value.event_id,
      id: this.store.nextAttemptId,
      player_id: this.value.player_id,
      puzzle_id: this.value.puzzle_id,
    });

    this.store.attempts.push(row);
    return { data: row, error: null };
  }
}

function installStore(store: FakeAttemptStore) {
  privilegedMocks.getClient.mockReturnValue(store.client());
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  contentMocks.getForEvent.mockResolvedValue(storedPuzzle);
});

describe("startStrandsAttempt", () => {
  it("creates a sanitized first Attempt", async () => {
    const store = installStore(new FakeAttemptStore());

    const result = await startStrandsAttempt({
      player,
      puzzleId: testStrandsPuzzle.id,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        attemptId: store.nextAttemptId,
        foundAnswers: [],
        gameStatus: "playing",
        version: 0,
        puzzle: {
          id: testStrandsPuzzle.id,
          themeClue: testStrandsPuzzle.themeClue,
          grid: testStrandsPuzzle.grid,
          answerCount: 7,
        },
      },
    });

    if (result.status === "ready") {
      expect(result.attempt.puzzle).not.toHaveProperty("themeWords");
      expect(result.attempt.puzzle).not.toHaveProperty("spangram");
    }
  });

  it("resumes the unfinished Attempt and reveals only already-found answers", async () => {
    const foundAnswer = testStrandsPuzzle.themeWords[0]!;
    installStore(
      new FakeAttemptStore([
        attemptRow({ found_words: [foundAnswer.word], version: 1 }),
      ]),
    );

    const result = await startStrandsAttempt({
      player,
      puzzleId: testStrandsPuzzle.id,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        attemptId,
        foundAnswers: [
          {
            word: foundAnswer.word,
            kind: "theme",
            path: foundAnswer.path,
          },
        ],
        gameStatus: "playing",
        version: 1,
      },
    });

    if (result.status === "ready") {
      expect(result.attempt.foundAnswers).toHaveLength(1);
    }
  });

  it("does not resume completed history and creates a fresh Attempt", async () => {
    const allAnswers = [
      ...testStrandsPuzzle.themeWords.map(({ word }) => word),
      testStrandsPuzzle.spangram.word,
    ];
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-09-08T02:05:00.000Z",
          found_words: allAnswers,
          version: allAnswers.length,
        }),
      ]),
    );

    const result = await startStrandsAttempt({
      player,
      puzzleId: testStrandsPuzzle.id,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        attemptId: store.nextAttemptId,
        foundAnswers: [],
        gameStatus: "playing",
        version: 0,
      },
    });
    expect(store.attempts).toHaveLength(2);
  });

  it("recovers a concurrent active-Attempt creation race", async () => {
    const store = installStore(new FakeAttemptStore());
    store.insertRaceAttempt = attemptRow();

    await expect(
      startStrandsAttempt({
        player,
        puzzleId: testStrandsPuzzle.id,
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId },
    });
  });

  it("returns not found before touching Attempt storage", async () => {
    contentMocks.getForEvent.mockResolvedValue(null);
    const store = installStore(new FakeAttemptStore());

    await expect(
      startStrandsAttempt({
        player,
        puzzleId: "missing",
      }),
    ).resolves.toEqual({ status: "not_found" });

    expect(store.attempts).toHaveLength(0);
  });

  it("rejects corrupted persisted found-word state", async () => {
    installStore(
      new FakeAttemptStore([
        attemptRow({ found_words: ["NOTANANSWER"], version: 1 }),
      ]),
    );

    await expect(
      startStrandsAttempt({
        player,
        puzzleId: testStrandsPuzzle.id,
      }),
    ).rejects.toThrow(/invalid game state/i);
  });
});
