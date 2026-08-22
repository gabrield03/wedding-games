import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionsPuzzle } from "@/domain/connections/types";
import type { Json, Tables } from "@/types/database.generated";
import { testConnectionsPuzzle } from "../../../fixtures/connections";

const contentMocks = vi.hoisted(() => ({
  byDatabaseId: vi.fn(),
  byPublicId: vi.fn(),
}));
const privilegedMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));
const cryptoMocks = vi.hoisted(() => ({
  nextToken: 1,
  randomInt: vi.fn((maximum: number) => maximum - 1),
  randomUUID: vi.fn(() => {
    const suffix = String(cryptoMocks.nextToken++).padStart(12, "0");

    return `50000000-0000-4000-8000-${suffix}`;
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();

  return {
    ...actual,
    randomInt: cryptoMocks.randomInt,
    randomUUID: cryptoMocks.randomUUID,
  };
});
vi.mock("@/content/connections/getConnectionsPuzzle", () => ({
  getConnectionsPuzzleByDatabaseIdForEvent: contentMocks.byDatabaseId,
  getConnectionsPuzzleForEvent: contentMocks.byPublicId,
}));
vi.mock("@/server/supabase/privileged", () => ({
  getPrivilegedSupabaseClient: privilegedMocks.getClient,
}));

import {
  startConnectionsAttempt,
  submitConnectionsGuess,
} from "@/server/connections/connectionsAttempts";

type AttemptRow = Tables<"connections_attempts">;
type AttemptInsert =
  Tables<"connections_attempts"> extends never
    ? never
    : {
        event_id: string;
        player_id: string;
        puzzle_id: string;
        tile_map: Json;
      };

const eventId = "00000000-0000-4000-8000-000000000001";
const playerId = "30000000-0000-4000-8000-000000000001";
const puzzleDatabaseId = "40000000-0000-4000-8000-000000000001";
const attemptId = "60000000-0000-4000-8000-000000000001";
const player = { eventId, id: playerId };
const storedPuzzle = {
  databaseId: puzzleDatabaseId,
  eventId,
  puzzle: testConnectionsPuzzle,
};

function token(index: number) {
  return `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

function tileMap(puzzle: ConnectionsPuzzle = testConnectionsPuzzle): Json {
  return puzzle.groups
    .flatMap((group) => group.tiles)
    .map((tile, index) => ({
      tileId: tile.id,
      token: token(index),
    }));
}

function attemptRow(overrides: Partial<AttemptRow> = {}): AttemptRow {
  return {
    completed_at: null,
    created_at: "2026-08-21T12:00:00.000Z",
    event_id: eventId,
    id: attemptId,
    incorrect_guesses: [],
    player_id: playerId,
    puzzle_id: puzzleDatabaseId,
    solved_group_ids: [],
    tile_map: tileMap(),
    updated_at: "2026-08-21T12:00:00.000Z",
    version: 0,
    ...overrides,
  };
}

class FakeAttemptStore {
  attempts: AttemptRow[];
  insertRaceAttempt: AttemptRow | null = null;
  insertError: { code: string; details: string; message: string } | null = null;
  updateRaceAttempt: AttemptRow | null = null;
  updateCount = 0;
  nextAttemptId = "60000000-0000-4000-8000-000000000099";

  constructor(attempts: AttemptRow[] = []) {
    this.attempts = attempts;
  }

  client() {
    return {
      from: (table: string) => {
        expect(table).toBe("connections_attempts");

        return {
          insert: (value: AttemptInsert) => new FakeInsertQuery(this, value),
          select: () => new FakeSelectQuery(this),
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

  constructor(private readonly store: FakeAttemptStore) {}

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

    return { data: attempts[0] ?? null, error: null };
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
          details:
            "connections_attempts_one_active_per_player_puzzle_idx conflict",
          message:
            'duplicate key violates "connections_attempts_one_active_per_player_puzzle_idx"',
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
      tile_map: this.value.tile_map,
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

function publicTokensForGroup(groupIndex: number) {
  return testConnectionsPuzzle.groups[groupIndex]!.tiles.map((tile) => {
    const index = testConnectionsPuzzle.groups
      .flatMap((group) => group.tiles)
      .findIndex((candidate) => candidate.id === tile.id);

    return token(index);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cryptoMocks.nextToken = 1;
  contentMocks.byPublicId.mockResolvedValue(storedPuzzle);
  contentMocks.byDatabaseId.mockResolvedValue(storedPuzzle);
});

describe("startConnectionsAttempt", () => {
  it("creates a new Attempt with opaque, sanitized tile tokens", async () => {
    const store = installStore(new FakeAttemptStore());

    const result = await startConnectionsAttempt({
      player,
      puzzleId: testConnectionsPuzzle.id,
    });

    expect(result.status).toBe("ready");
    expect(store.attempts).toHaveLength(1);

    if (result.status !== "ready") return;

    expect(result.attempt.remainingTiles).toHaveLength(16);
    expect(
      result.attempt.remainingTiles.every((tile) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          tile.id,
        ),
      ),
    ).toBe(true);
    expect(
      new Set(result.attempt.remainingTiles.map((tile) => tile.id)).size,
    ).toBe(16);
    expect(JSON.stringify(result.attempt)).not.toContain("group-letters");
    expect(JSON.stringify(result.attempt)).not.toContain("letter-a");
    expect(JSON.stringify(result.attempt)).not.toContain("Letters");
  });

  it("resumes the active Attempt with its stable token mapping", async () => {
    installStore(new FakeAttemptStore([attemptRow()]));

    const result = await startConnectionsAttempt({
      player,
      puzzleId: testConnectionsPuzzle.id,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: { attemptId, version: 0 },
    });
    if (result.status === "ready") {
      expect(result.attempt.remainingTiles[0]!.id).toBe(token(0));
    }
  });

  it("resumes the latest completed Attempt instead of creating a replay", async () => {
    const completed = attemptRow({
      completed_at: "2026-08-21T12:05:00.000Z",
      incorrect_guesses: [
        publicTokensForGroup(0),
        publicTokensForGroup(1),
        publicTokensForGroup(2),
        publicTokensForGroup(3),
      ].map((tokens) =>
        tokens.map(
          (value) =>
            (tileMap() as Array<{ tileId: string; token: string }>).find(
              (mapping) => mapping.token === value,
            )!.tileId,
        ),
      ),
      version: 4,
    });
    const store = installStore(new FakeAttemptStore([completed]));

    const result = await startConnectionsAttempt({
      player,
      puzzleId: testConnectionsPuzzle.id,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: { attemptId, gameStatus: "lost", version: 4 },
    });
    expect(store.attempts).toHaveLength(1);
  });

  it("creates a distinct replay from a completed owned Attempt", async () => {
    const completed = attemptRow({
      completed_at: "2026-08-21T12:05:00.000Z",
      solved_group_ids: testConnectionsPuzzle.groups.map((group) => group.id),
      version: 4,
    });
    const store = installStore(new FakeAttemptStore([completed]));

    const result = await startConnectionsAttempt({
      player,
      puzzleId: testConnectionsPuzzle.id,
      replayFromAttemptId: attemptId,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: { attemptId: store.nextAttemptId, version: 0 },
    });
    expect(store.attempts).toHaveLength(2);
  });

  it("returns an existing active Attempt for concurrent replay retries", async () => {
    const completed = attemptRow({
      completed_at: "2026-08-21T12:05:00.000Z",
      solved_group_ids: testConnectionsPuzzle.groups.map((group) => group.id),
    });
    const active = attemptRow({
      created_at: "2026-08-21T12:06:00.000Z",
      id: "60000000-0000-4000-8000-000000000002",
    });
    const store = installStore(new FakeAttemptStore([completed, active]));

    const result = await startConnectionsAttempt({
      player,
      puzzleId: testConnectionsPuzzle.id,
      replayFromAttemptId: attemptId,
    });

    expect(result).toMatchObject({
      status: "ready",
      attempt: { attemptId: active.id },
    });
    expect(store.attempts).toHaveLength(2);
  });

  it("rejects replay from an incomplete or unowned source", async () => {
    installStore(new FakeAttemptStore([attemptRow()]));

    await expect(
      startConnectionsAttempt({
        player,
        puzzleId: testConnectionsPuzzle.id,
        replayFromAttemptId: attemptId,
      }),
    ).resolves.toMatchObject({ status: "replay_not_complete" });

    await expect(
      startConnectionsAttempt({
        player,
        puzzleId: testConnectionsPuzzle.id,
        replayFromAttemptId: "60000000-0000-4000-8000-000000000999",
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("recovers only the expected active-Attempt insert race", async () => {
    const store = installStore(new FakeAttemptStore());
    store.insertRaceAttempt = attemptRow();

    await expect(
      startConnectionsAttempt({
        player,
        puzzleId: testConnectionsPuzzle.id,
      }),
    ).resolves.toMatchObject({
      status: "ready",
      attempt: { attemptId },
    });

    const failedStore = installStore(new FakeAttemptStore());
    failedStore.insertError = {
      code: "23505",
      details: "another unique constraint",
      message: "unrelated insert failure",
    };

    await expect(
      startConnectionsAttempt({
        player,
        puzzleId: testConnectionsPuzzle.id,
      }),
    ).rejects.toThrow("Failed to create the Connections Attempt.");
  });

  it("rejects corrupt mappings, state, and terminal markers", async () => {
    const invalidRows = [
      attemptRow({ tile_map: [] }),
      attemptRow({ solved_group_ids: ["unknown-group"] }),
      attemptRow({ completed_at: "2026-08-21T12:05:00.000Z" }),
      attemptRow({
        solved_group_ids: testConnectionsPuzzle.groups.map((group) => group.id),
      }),
    ];

    for (const row of invalidRows) {
      installStore(new FakeAttemptStore([row]));

      await expect(
        startConnectionsAttempt({
          player,
          puzzleId: testConnectionsPuzzle.id,
        }),
      ).rejects.toThrow(/Connections Attempt/);
    }
  });
});

describe("submitConnectionsGuess", () => {
  it("evaluates correct guesses and reveals only the solved group", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: publicTokensForGroup(0),
      version: 0,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "correct",
      attempt: {
        version: 1,
        gameStatus: "playing",
        displayedGroups: [{ category: "Letters" }],
      },
    });
    expect(store.updateCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain("group-letters");
    expect(JSON.stringify(result)).not.toContain("letter-a");
    expect(JSON.stringify(result)).not.toContain("Numbers");
  });

  it("evaluates incorrect and one-away guesses", async () => {
    const incorrectStore = installStore(new FakeAttemptStore([attemptRow()]));
    const incorrect = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: [token(0), token(1), token(4), token(5)],
      version: 0,
    });

    expect(incorrect).toMatchObject({
      status: "submitted",
      outcome: "incorrect",
      attempt: { mistakesRemaining: 3, version: 1 },
    });
    expect(incorrectStore.updateCount).toBe(1);

    const oneAwayStore = installStore(new FakeAttemptStore([attemptRow()]));
    const oneAway = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: [token(0), token(1), token(2), token(4)],
      version: 0,
    });

    expect(oneAway).toMatchObject({
      status: "submitted",
      outcome: "one_away",
      attempt: { mistakesRemaining: 3, version: 1 },
    });
    expect(oneAwayStore.updateCount).toBe(1);
  });

  it("returns duplicate without mutating or incrementing version", async () => {
    const internalGuess = ["letter-a", "letter-b", "number-1", "number-2"];
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ incorrect_guesses: [internalGuess], version: 1 }),
      ]),
    );

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: [token(0), token(1), token(4), token(5)],
      version: 1,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "duplicate",
      attempt: { version: 1 },
    });
    expect(store.updateCount).toBe(0);
  });

  it("derives loss and reveals all groups after the fourth mistake", async () => {
    const previousGuesses = [
      ["letter-a", "letter-b", "number-1", "number-2"],
      ["letter-a", "letter-c", "number-1", "number-3"],
      ["letter-b", "letter-d", "symbol-exclamation", "symbol-at"],
    ];
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({ incorrect_guesses: previousGuesses, version: 3 }),
      ]),
    );

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: [token(5), token(7), token(12), token(13)],
      version: 3,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "incorrect",
      attempt: {
        gameStatus: "lost",
        mistakesRemaining: 0,
        version: 4,
      },
    });
    if (result.status === "submitted") {
      expect(result.attempt.displayedGroups).toHaveLength(4);
      expect(result.attempt.remainingTiles).toHaveLength(0);
    }
    expect(store.attempts[0]!.completed_at).not.toBeNull();
  });

  it("derives a win after the final solved group", async () => {
    const store = installStore(
      new FakeAttemptStore([
        attemptRow({
          solved_group_ids: testConnectionsPuzzle.groups
            .slice(0, 3)
            .map((group) => group.id),
          version: 3,
        }),
      ]),
    );

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: publicTokensForGroup(3),
      version: 3,
    });

    expect(result).toMatchObject({
      status: "submitted",
      outcome: "correct",
      attempt: { gameStatus: "won", version: 4 },
    });
    expect(store.attempts[0]!.completed_at).not.toBeNull();
  });

  it("rejects malformed, unknown, solved, and terminal actions without mutation", async () => {
    const unknownStore = installStore(new FakeAttemptStore([attemptRow()]));

    await expect(
      submitConnectionsGuess({
        player,
        attemptId,
        tileIds: [token(0), token(1), token(2), crypto.randomUUID()],
        version: 0,
      }),
    ).resolves.toEqual({ status: "invalid_request" });
    expect(unknownStore.updateCount).toBe(0);

    const solvedStore = installStore(
      new FakeAttemptStore([
        attemptRow({ solved_group_ids: [testConnectionsPuzzle.groups[0]!.id] }),
      ]),
    );
    await expect(
      submitConnectionsGuess({
        player,
        attemptId,
        tileIds: [token(0), token(4), token(5), token(6)],
        version: 0,
      }),
    ).resolves.toMatchObject({ status: "invalid_action" });
    expect(solvedStore.updateCount).toBe(0);

    const terminalStore = installStore(
      new FakeAttemptStore([
        attemptRow({
          completed_at: "2026-08-21T12:05:00.000Z",
          solved_group_ids: testConnectionsPuzzle.groups.map(
            (group) => group.id,
          ),
        }),
      ]),
    );
    await expect(
      submitConnectionsGuess({
        player,
        attemptId,
        tileIds: publicTokensForGroup(0),
        version: 0,
      }),
    ).resolves.toMatchObject({ status: "invalid_action" });
    expect(terminalStore.updateCount).toBe(0);
  });

  it("returns stale before evaluating an otherwise valid guess", async () => {
    const store = installStore(
      new FakeAttemptStore([attemptRow({ version: 2 })]),
    );

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: publicTokensForGroup(0),
      version: 1,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: { version: 2 },
    });
    expect(store.updateCount).toBe(0);
  });

  it("reloads the winning snapshot when a conditional update loses a race", async () => {
    const store = installStore(new FakeAttemptStore([attemptRow()]));
    store.updateRaceAttempt = attemptRow({
      incorrect_guesses: [["letter-a", "letter-b", "number-1", "number-2"]],
      version: 1,
    });

    const result = await submitConnectionsGuess({
      player,
      attemptId,
      tileIds: publicTokensForGroup(0),
      version: 0,
    });

    expect(result).toMatchObject({
      status: "stale",
      attempt: { mistakesRemaining: 3, version: 1 },
    });
  });

  it("does not find an Attempt outside the trusted Player scope", async () => {
    installStore(
      new FakeAttemptStore([
        attemptRow({ player_id: "30000000-0000-4000-8000-000000000999" }),
      ]),
    );

    await expect(
      submitConnectionsGuess({
        player,
        attemptId,
        tileIds: publicTokensForGroup(0),
        version: 0,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });
});
