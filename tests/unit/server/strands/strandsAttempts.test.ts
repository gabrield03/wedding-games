import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  StoredStrandsPuzzle,
  StoredStrandsPuzzleRow,
} from "@/content/strands/getStrandsPuzzle";
import type { Json, Tables } from "@/types/database.generated";
import { testStrandsPuzzle } from "../../../fixtures/strands";

const contentMocks = vi.hoisted(() => ({
  decodeStored: vi.fn(),
  getForEvent: vi.fn(),
}));
const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/content/strands/getStrandsPuzzle", () => ({
  decodeStoredStrandsPuzzle: contentMocks.decodeStored,
  getStrandsPuzzleForEvent: contentMocks.getForEvent,
}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import {
  requestStrandsHint,
  startStrandsAttempt,
  submitStrandsPath,
} from "@/server/strands/strandsAttempts";

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

function storedPuzzle(): StoredStrandsPuzzle {
  return {
    databaseId: puzzleDatabaseId,
    eventId,
    puzzle: testStrandsPuzzle,
  };
}

function storedPuzzleRow(): StoredStrandsPuzzleRow {
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
  };
}

function attemptRow(overrides: Partial<AttemptRow> = {}): AttemptRow {
  return {
    active_hint_word: null,
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
  embeddedPuzzle: StoredStrandsPuzzleRow | null = storedPuzzleRow();
  insertRaceAttempt: AttemptRow | null = null;
  nextAttemptId = "60000000-0000-4000-8000-000000000399";
  selectQueries: Array<{
    columns: string;
    filters: Array<[keyof AttemptRow, unknown]>;
  }> = [];
  updateCount = 0;
  updateFilters: Array<Array<[keyof AttemptRow, unknown]>> = [];
  updateRaceAttempt: AttemptRow | null = null;

  constructor(attempts: AttemptRow[] = []) {
    this.attempts = attempts;
  }

  client() {
    return {
      from: (table: string) => {
        expect(table).toBe("strands_attempts");

        return {
          insert: (value: AttemptInsert) => new FakeInsertQuery(this, value),
          select: (columns: string) => new FakeSelectQuery(this, columns),
          update: (value: Partial<AttemptRow>) =>
            new FakeUpdateQuery(this, value),
        };
      },
    };
  }
}

class FakeSelectQuery {
  private filters: Array<[keyof AttemptRow, unknown]> = [];
  private activeOnly = false;

  constructor(
    private readonly store: FakeAttemptStore,
    private readonly columns: string,
  ) {}

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
    this.store.selectQueries.push({
      columns: this.columns,
      filters: [...this.filters],
    });
    const attempt = this.store.attempts.find(
      (row) =>
        this.filters.every(([key, value]) => row[key] === value) &&
        (!this.activeOnly || row.completed_at === null),
    );
    const data =
      attempt && this.columns.includes("puzzle:strands_puzzles!")
        ? { ...attempt, puzzle: this.store.embeddedPuzzle }
        : attempt;

    return { data: data ?? null, error: null };
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

class FakeUpdateQuery {
  private filters: Array<[keyof AttemptRow, unknown]> = [];

  constructor(
    private readonly store: FakeAttemptStore,
    private readonly value: Partial<AttemptRow>,
  ) {}

  eq(key: keyof AttemptRow, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }

  select() {
    return this;
  }

  async maybeSingle() {
    this.store.updateCount += 1;
    this.store.updateFilters.push([...this.filters]);

    const index = this.store.attempts.findIndex((attempt) =>
      this.filters.every(([key, value]) => attempt[key] === value),
    );

    if (this.store.updateRaceAttempt) {
      const raceIndex = this.store.attempts.findIndex(
        (attempt) => attempt.id === this.store.updateRaceAttempt!.id,
      );

      this.store.attempts[raceIndex] = this.store.updateRaceAttempt;
      this.store.updateRaceAttempt = null;
      return { data: null, error: null };
    }

    if (index < 0) {
      return { data: null, error: null };
    }

    const updated = { ...this.store.attempts[index]!, ...this.value };
    this.store.attempts[index] = updated;

    return { data: updated, error: null };
  }
}

function installStore(store: FakeAttemptStore) {
  privilegedMocks.getClient.mockReturnValue(store.client());
  return store;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  contentMocks.getForEvent.mockResolvedValue(storedPuzzle());
  contentMocks.decodeStored.mockReturnValue(storedPuzzle());
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
  });

  it("does not resume completed history and creates a fresh Attempt", async () => {
    const allAnswers = allAnswerWords();
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
});

describe("requestStrandsHint", () => {
  it("persists one eligible theme hint and returns only its tile path", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        version: 1,
        hintedTileIndexes: answer.path,
        foundAnswers: [],
      },
    });
    expect(store.attempts[0]!.active_hint_word).toBe(answer.word);
    expect(JSON.stringify(result)).not.toContain(
      `"word":"${answer.word}"`,
    );
    expect(JSON.stringify(result)).not.toContain('"hintedPath"');
  });

  it("keeps the same active hint without incrementing version again", async () => {
    const answer = testStrandsPuzzle.themeWords[1]!;
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          active_hint_word: answer.word,
          version: 1,
        }),
      ]),
    );

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: 1,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        version: 1,
        hintedTileIndexes: answer.path,
      },
    });
    expect(store.updateCount).toBe(0);
    expect(random).not.toHaveBeenCalled();
  });

  it("chooses only among unfound theme words and never the spangram", async () => {
    const found = testStrandsPuzzle.themeWords[0]!;
    const remaining = testStrandsPuzzle.themeWords[1]!;
    vi.spyOn(Math, "random").mockReturnValue(0);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          found_words: [found.word],
          version: 1,
        }),
      ]),
    );

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: 1,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        hintedTileIndexes: remaining.path,
      },
    });
    expect(store.attempts[0]!.active_hint_word).toBe(remaining.word);
    expect(store.attempts[0]!.active_hint_word).not.toBe(
      testStrandsPuzzle.spangram.word,
    );
  });

  it("returns stale before changing an existing hint", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          active_hint_word: answer.word,
          version: 2,
        }),
      ]),
    );

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: 1,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: {
        version: 2,
        hintedTileIndexes: answer.path,
      },
    });
    expect(store.updateCount).toBe(0);
  });

  it("rejects hints when only the spangram remains", async () => {
    const foundWords = testStrandsPuzzle.themeWords.map(({ word }) => word);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          found_words: foundWords,
          version: foundWords.length,
        }),
      ]),
    );

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: foundWords.length,
    });

    expect(result).toMatchObject({
      status: "invalid_action",
      attempt: { hintedTileIndexes: null },
    });
    expect(store.updateCount).toBe(0);
  });

  it("rejects hints for completed Attempts", async () => {
    const foundWords = allAnswerWords();
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-09-08T02:05:00.000Z",
          found_words: foundWords,
          version: foundWords.length,
        }),
      ]),
    );

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: foundWords.length,
    });

    expect(result).toMatchObject({
      status: "invalid_action",
      attempt: { gameStatus: "complete" },
    });
    expect(store.updateCount).toBe(0);
  });

  it("reconciles a concurrent hint update as stale", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.updateRaceAttempt = attemptRow({
      active_hint_word: answer.word,
      version: 1,
    });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = await requestStrandsHint({
      player,
      attemptId,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: {
        version: 1,
        hintedTileIndexes: answer.path,
      },
    });
  });
});

describe("submitStrandsPath", () => {
  it("clears the active hint when its answer is found", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          active_hint_word: answer.word,
          version: 1,
        }),
      ]),
    );

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: answer.path,
      version: 1,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "found_theme",
      attempt: {
        version: 2,
        hintedTileIndexes: null,
      },
    });
    expect(store.attempts[0]!.active_hint_word).toBeNull();
  });

  it("persists a newly found theme answer and reveals only that answer", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: answer.path,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "found_theme",
      attempt: {
        version: 1,
        gameStatus: "playing",
        foundAnswers: [
          {
            word: answer.word,
            kind: "theme",
            path: answer.path,
          },
        ],
      },
    });
    expect(store.attempts[0]!.found_words).toEqual([answer.word]);
    expect(store.updateFilters).toEqual([
      [
        ["id", attemptId],
        ["event_id", eventId],
        ["player_id", playerId],
        ["version", 0],
      ],
    ]);

    if (result.status === "submitted") {
      expect(result.attempt.puzzle).not.toHaveProperty("themeWords");
      expect(result.attempt.puzzle).not.toHaveProperty("spangram");
      expect(result.attempt.foundAnswers).toHaveLength(1);
    }
  });

  it("persists a spangram found before the rest of the puzzle", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: testStrandsPuzzle.spangram.path,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "found_spangram",
      attempt: {
        version: 1,
        gameStatus: "playing",
        foundAnswers: [
          {
            word: testStrandsPuzzle.spangram.word,
            kind: "spangram",
          },
        ],
      },
    });
    expect(store.attempts[0]!.completed_at).toBeNull();
  });

  it("returns non-answer and invalid paths without mutating the Attempt", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const notTheme = await submitStrandsPath({
      player,
      attemptId,
      path: [0, 6, 12, 18],
      version: 0,
    });
    const invalidPath = await submitStrandsPath({
      player,
      attemptId,
      path: [0, 2, 3, 4],
      version: 0,
    });

    expect(notTheme).toMatchObject({
      status: "submitted",
      outcome: "not_theme",
      attempt: { version: 0 },
    });
    expect(invalidPath).toMatchObject({
      status: "submitted",
      outcome: "invalid_path",
      attempt: { version: 0 },
    });
    expect(store.updateCount).toBe(0);
  });

  it("returns already-found without duplicating or mutating state", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ found_words: [answer.word], version: 1 }),
      ]),
    );

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: answer.path,
      version: 1,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "already_found",
      attempt: { version: 1 },
    });
    expect(store.attempts[0]!.found_words).toEqual([answer.word]);
    expect(store.updateCount).toBe(0);
  });

  it("marks the Attempt complete when the final answer is found", async () => {
    const finalAnswer = testStrandsPuzzle.spangram;
    const foundWords = testStrandsPuzzle.themeWords.map(({ word }) => word);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          found_words: foundWords,
          version: foundWords.length,
        }),
      ]),
    );

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: finalAnswer.path,
      version: foundWords.length,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "game_complete",
      attempt: {
        gameStatus: "complete",
        version: foundWords.length + 1,
      },
    });
    expect(store.attempts[0]!.completed_at).not.toBeNull();
    expect(store.attempts[0]!.found_words).toEqual([
      ...foundWords,
      finalAnswer.word,
    ]);
  });

  it("returns the current snapshot for stale versions before evaluating the path", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ found_words: [answer.word], version: 1 }),
      ]),
    );

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: testStrandsPuzzle.themeWords[1]!.path,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: {
        version: 1,
        foundAnswers: [{ word: answer.word }],
      },
    });
    expect(store.updateCount).toBe(0);
  });

  it("rejects submissions to a completed Attempt", async () => {
    const foundWords = allAnswerWords();
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-09-08T02:05:00.000Z",
          found_words: foundWords,
          version: foundWords.length,
        }),
      ]),
    );

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: testStrandsPuzzle.themeWords[0]!.path,
      version: foundWords.length,
    });

    expect(result).toMatchObject({
      status: "invalid_action",
      attempt: { gameStatus: "complete" },
    });
    expect(store.updateCount).toBe(0);
  });

  it("reconciles a concurrent successful update as stale", async () => {
    const firstAnswer = testStrandsPuzzle.themeWords[0]!;
    const secondAnswer = testStrandsPuzzle.themeWords[1]!;
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.updateRaceAttempt = attemptRow({
      found_words: [firstAnswer.word],
      version: 1,
    });

    const result = await submitStrandsPath({
      player,
      attemptId,
      path: secondAnswer.path,
      version: 0,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: {
        version: 1,
        foundAnswers: [{ word: firstAnswer.word }],
      },
    });
  });

  it("does not load an Attempt outside the trusted Player scope", async () => {
    installStore(
      new FakeAttemptStore([
        attemptRow({
          player_id: "30000000-0000-4000-8000-000000000999",
        }),
      ]),
    );

    await expect(
      submitStrandsPath({
        player,
        attemptId,
        path: testStrandsPuzzle.themeWords[0]!.path,
        version: 0,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("fails safely when the authoritative puzzle relationship is missing", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.embeddedPuzzle = null;

    await expect(
      submitStrandsPath({
        player,
        attemptId,
        path: testStrandsPuzzle.themeWords[0]!.path,
        version: 0,
      }),
    ).rejects.toThrow("Strands Attempt is missing its authoritative puzzle.");
  });
});

function allAnswerWords() {
  return [
    ...testStrandsPuzzle.themeWords.map(({ word }) => word),
    testStrandsPuzzle.spangram.word,
  ];
}
