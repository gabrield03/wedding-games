import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  StoredWordlePuzzle,
  StoredWordlePuzzleRow,
} from "@/content/wordle/getWordlePuzzle";
import { evaluateWordleGuess } from "@/domain/wordle/gameplay";
import type { Tables } from "@/types/database.generated";

const contentMocks = vi.hoisted(() => ({
  byPublicId: vi.fn(),
  decodeStored: vi.fn(),
}));
const dictionaryMocks = vi.hoisted(() => ({
  isAccepted: vi.fn(),
}));
const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/content/wordle/getWordlePuzzle", () => ({
  decodeStoredWordlePuzzle: contentMocks.decodeStored,
  getWordlePuzzleForEvent: contentMocks.byPublicId,
}));
vi.mock("@/server/wordle/acceptedGuesses", () => ({
  isAcceptedWordleGuess: dictionaryMocks.isAccepted,
}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import {
  startWordleAttempt,
  submitWordleGuess,
} from "@/server/wordle/wordleAttempts";

type AttemptRow = Tables<"wordle_attempts">;
type AttemptInsert = {
  event_id: string;
  player_id: string;
  puzzle_id: string;
};

const eventId = "00000000-0000-4000-8000-000000000001";
const playerId = "30000000-0000-4000-8000-000000000001";
const puzzleDatabaseId = "40000000-0000-4000-8000-000000000101";
const attemptId = "60000000-0000-4000-8000-000000000101";
const player = { eventId, id: playerId };

function storedPuzzle(answer = "BRIDE"): StoredWordlePuzzle {
  return {
    databaseId: puzzleDatabaseId,
    eventId,
    puzzle: { id: "wedding-01", answer },
  };
}

function storedPuzzleRow(answer = "BRIDE"): StoredWordlePuzzleRow {
  return {
    answer,
    event_id: eventId,
    id: puzzleDatabaseId,
    public_id: "wedding-01",
  };
}

function attemptRow(overrides: Partial<AttemptRow> = {}): AttemptRow {
  return {
    completed_at: null,
    created_at: "2026-08-22T12:00:00.000Z",
    event_id: eventId,
    id: attemptId,
    player_id: playerId,
    puzzle_id: puzzleDatabaseId,
    submitted_guesses: [],
    updated_at: "2026-08-22T12:00:00.000Z",
    version: 0,
    ...overrides,
  };
}

class FakeAttemptStore {
  attempts: AttemptRow[];
  embeddedPuzzle: StoredWordlePuzzleRow | null = storedPuzzleRow();
  insertRaceAttempt: AttemptRow | null = null;
  insertError: { code: string; details: string; message: string } | null = null;
  nextAttemptId = "60000000-0000-4000-8000-000000000199";
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
        expect(table).toBe("wordle_attempts");

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
  private completedAtIsNull = false;
  private descending = false;

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
    this.completedAtIsNull = true;
    return this;
  }

  order(key: keyof AttemptRow, options: { ascending: boolean }) {
    expect(key).toBe("created_at");
    this.descending = !options.ascending;
    return this;
  }

  limit(value: number) {
    expect(value).toBe(1);
    return this;
  }

  async maybeSingle() {
    this.store.selectQueries.push({
      columns: this.columns,
      filters: [...this.filters],
    });
    const attempts = this.store.attempts
      .filter((attempt) =>
        this.filters.every(([key, value]) => attempt[key] === value),
      )
      .filter(
        (attempt) => !this.completedAtIsNull || attempt.completed_at === null,
      )
      .sort((first, second) =>
        this.descending ? second.created_at.localeCompare(first.created_at) : 0,
      );
    const attempt = attempts[0];
    const data =
      attempt && this.columns.includes("puzzle:wordle_puzzles!")
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
          details: "wordle_attempts_one_active_per_player_puzzle_idx conflict",
          message:
            'duplicate key violates "wordle_attempts_one_active_per_player_puzzle_idx"',
        },
      };
    }

    if (this.store.insertError) {
      return { data: null, error: this.store.insertError };
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
      const existingIndex = this.store.attempts.findIndex(
        (attempt) => attempt.id === this.store.updateRaceAttempt!.id,
      );
      this.store.attempts[existingIndex] = this.store.updateRaceAttempt;
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

function installPuzzle(answer = "BRIDE") {
  const stored = storedPuzzle(answer);

  contentMocks.byPublicId.mockResolvedValue(stored);
  contentMocks.decodeStored.mockImplementation((row: StoredWordlePuzzleRow) =>
    storedPuzzle(row.answer),
  );
  return stored;
}

beforeEach(() => {
  vi.clearAllMocks();
  dictionaryMocks.isAccepted.mockReturnValue(true);
  installPuzzle();
});

describe("startWordleAttempt", () => {
  it("creates the first Attempt without exposing the answer", async () => {
    const store = installStore(new FakeAttemptStore());

    const result = await startWordleAttempt({
      player,
      puzzleId: "wedding-01",
      startMode: "resume",
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: {
        attemptId: store.nextAttemptId,
        gameStatus: "playing",
        submittedGuesses: [],
        version: 0,
      },
    });
    expect(JSON.stringify(result)).not.toContain("BRIDE");
  });

  it("resumes an active Attempt", async () => {
    installStore(
      new FakeAttemptStore([
        attemptRow({ submitted_guesses: ["CRANE"], version: 1 }),
      ]),
    );

    await expect(
      startWordleAttempt({
        player,
        puzzleId: "wedding-01",
        startMode: "resume",
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId, version: 1 },
    });
  });

  it("resumes the latest completed Attempt in resume mode", async () => {
    const completed = attemptRow({
      completed_at: "2026-08-22T12:05:00.000Z",
      submitted_guesses: ["BRIDE"],
      version: 1,
    });
    installStore(new FakeAttemptStore([completed]));

    await expect(
      startWordleAttempt({
        player,
        puzzleId: "wedding-01",
        startMode: "resume",
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId, gameStatus: "won", version: 1 },
    });
  });

  it("creates a new Attempt after completed history in new mode", async () => {
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-08-22T12:05:00.000Z",
          submitted_guesses: ["BRIDE"],
          version: 1,
        }),
      ]),
    );

    const result = await startWordleAttempt({
      player,
      puzzleId: "wedding-01",
      startMode: "new",
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: { attemptId: store.nextAttemptId, version: 0 },
    });
    expect(store.attempts).toHaveLength(2);
  });

  it("resumes an existing active Attempt even in new mode", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    await expect(
      startWordleAttempt({
        player,
        puzzleId: "wedding-01",
        startMode: "new",
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId },
    });
    expect(store.attempts).toHaveLength(1);
  });

  it("recovers the expected concurrent active-Attempt insert race", async () => {
    const store = installStore(new FakeAttemptStore());
    store.insertRaceAttempt = attemptRow();

    await expect(
      startWordleAttempt({
        player,
        puzzleId: "wedding-01",
        startMode: "new",
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId },
    });
  });
});

describe("submitWordleGuess", () => {
  it("accepts an ordinary guess through one owned Attempt+puzzle read and an exact conditional update", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "crane",
      version: 0,
    });

    expect(result).toMatchObject({
      status: "submitted",
      attempt: {
        gameStatus: "playing",
        submittedGuesses: [{ guess: "CRANE" }],
        version: 1,
      },
    });
    expect(result.status === "submitted" && result.attempt).not.toHaveProperty(
      "revealedAnswer",
    );
    expect(store.selectQueries[0]).toEqual({
      columns: expect.stringContaining(
        "puzzle:wordle_puzzles!wordle_attempts_puzzle_fkey",
      ),
      filters: [
        ["id", attemptId],
        ["event_id", eventId],
        ["player_id", playerId],
      ],
    });
    expect(contentMocks.decodeStored).toHaveBeenCalledWith(storedPuzzleRow());
    expect(store.updateFilters).toEqual([
      [
        ["id", attemptId],
        ["event_id", eventId],
        ["player_id", playerId],
        ["version", 0],
      ],
    ]);
  });

  it("preserves duplicate-letter evaluation through the existing domain rule", async () => {
    installPuzzle("APPLE");
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.embeddedPuzzle = storedPuzzleRow("APPLE");

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "ALLEY",
      version: 0,
    });

    expect(result).toMatchObject({ status: "submitted" });
    if (result.status !== "submitted") return;
    expect(result.attempt.submittedGuesses[0]!.evaluation).toEqual(
      evaluateWordleGuess("APPLE", "ALLEY"),
    );
  });

  it("derives an early win without a separate answer field", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "BRIDE",
      version: 0,
    });

    expect(result).toMatchObject({
      status: "submitted",
      attempt: {
        gameStatus: "won",
        submittedGuesses: [{ guess: "BRIDE" }],
      },
    });
    if (result.status === "submitted") {
      expect(result.attempt).not.toHaveProperty("revealedAnswer");
    }
    expect(store.attempts[0]!.completed_at).not.toBeNull();
  });

  it("wins on the sixth attempt before applying the loss condition", async () => {
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          submitted_guesses: Array(5).fill("CRANE") as string[],
          version: 5,
        }),
      ]),
    );

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "BRIDE",
      version: 5,
    });

    expect(result).toMatchObject({
      status: "submitted",
      attempt: { gameStatus: "won", version: 6 },
    });
    expect(store.attempts[0]!.completed_at).not.toBeNull();
  });

  it("loses on the sixth miss and only then reveals the answer", async () => {
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          submitted_guesses: Array(5).fill("CRANE") as string[],
          version: 5,
        }),
      ]),
    );

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "SLATE",
      version: 5,
    });

    expect(result).toMatchObject({
      status: "submitted",
      attempt: {
        gameStatus: "lost",
        revealedAnswer: "BRIDE",
        version: 6,
      },
    });
    expect(store.attempts[0]!.completed_at).not.toBeNull();
  });

  it("continues accepting repeated valid guesses", async () => {
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ submitted_guesses: ["CRANE"], version: 1 }),
      ]),
    );

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "CRANE",
      version: 1,
    });

    expect(result).toMatchObject({
      status: "submitted",
      attempt: { submittedGuesses: [{ guess: "CRANE" }, { guess: "CRANE" }] },
    });
    expect(store.updateCount).toBe(1);
  });

  it("rejects an unaccepted word without mutating state or version", async () => {
    dictionaryMocks.isAccepted.mockReturnValue(false);
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "QZXQZ",
      version: 0,
    });

    expect(result).toMatchObject({
      status: "invalid_word",
      attempt: { submittedGuesses: [], version: 0 },
    });
    expect(store.updateCount).toBe(0);
  });

  it("always accepts the authoritative answer even when absent from the dictionary", async () => {
    installPuzzle("QZXQZ");
    dictionaryMocks.isAccepted.mockReturnValue(false);
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.embeddedPuzzle = storedPuzzleRow("QZXQZ");

    await expect(
      submitWordleGuess({
        player,
        attemptId,
        guess: "qzxqz",
        version: 0,
      }),
    ).resolves.toMatchObject({
      status: "submitted",
      attempt: { gameStatus: "won" },
    });
    expect(dictionaryMocks.isAccepted).not.toHaveBeenCalled();
  });

  it("gives stale reconciliation precedence over dictionary rejection", async () => {
    dictionaryMocks.isAccepted.mockReturnValue(false);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ submitted_guesses: ["CRANE"], version: 1 }),
      ]),
    );

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "QZXQZ",
      version: 0,
    });

    expect(result).toMatchObject({ status: "stale", attempt: { version: 1 } });
    expect(dictionaryMocks.isAccepted).not.toHaveBeenCalled();
    expect(store.updateCount).toBe(0);
  });

  it("gives terminal invalid-action handling precedence over dictionary rejection", async () => {
    dictionaryMocks.isAccepted.mockReturnValue(false);
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-08-22T12:05:00.000Z",
          submitted_guesses: ["BRIDE"],
          version: 1,
        }),
      ]),
    );

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "QZXQZ",
      version: 1,
    });

    expect(result).toMatchObject({ status: "invalid_action" });
    expect(dictionaryMocks.isAccepted).not.toHaveBeenCalled();
    expect(store.updateCount).toBe(0);
  });

  it("returns the winning snapshot when a conditional update loses a race", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.updateRaceAttempt = attemptRow({
      submitted_guesses: ["CRANE"],
      version: 1,
    });

    const result = await submitWordleGuess({
      player,
      attemptId,
      guess: "SLATE",
      version: 0,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: { submittedGuesses: [{ guess: "CRANE" }], version: 1 },
    });
    expect(contentMocks.decodeStored).toHaveBeenCalledTimes(1);
  });

  it("does not find an Attempt outside the trusted Player scope", async () => {
    installStore(
      new FakeAttemptStore([
        attemptRow({ player_id: "30000000-0000-4000-8000-000000000999" }),
      ]),
    );

    await expect(
      submitWordleGuess({
        player,
        attemptId,
        guess: "CRANE",
        version: 0,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("fails safely for missing or malformed embedded authoritative content", async () => {
    const missingStore = installStore(new FakeAttemptStore([attemptRow()]));
    missingStore.embeddedPuzzle = null;

    await expect(
      submitWordleGuess({
        player,
        attemptId,
        guess: "CRANE",
        version: 0,
      }),
    ).rejects.toThrow("Wordle Attempt is missing its authoritative puzzle.");

    vi.clearAllMocks();
    dictionaryMocks.isAccepted.mockReturnValue(true);
    contentMocks.decodeStored.mockImplementationOnce(() => {
      throw new Error("Wordle puzzle failed validation.");
    });
    installStore(new FakeAttemptStore([attemptRow()]));

    await expect(
      submitWordleGuess({
        player,
        attemptId,
        guess: "CRANE",
        version: 0,
      }),
    ).rejects.toThrow("Wordle puzzle failed validation.");
  });
});
