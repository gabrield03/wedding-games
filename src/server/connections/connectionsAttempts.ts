import "server-only";

import { randomInt, randomUUID } from "node:crypto";

import type {
  ConnectionsAttemptSnapshot,
  ConnectionsGuessOutcome,
} from "@/contracts/connections";
import {
  getConnectionsPuzzleByDatabaseIdForEvent,
  getConnectionsPuzzleForEvent,
  type StoredConnectionsPuzzle,
} from "@/content/connections/getConnectionsPuzzle";
import {
  applyGuessResult,
  evaluateGuess,
  getGameStatus,
  getMistakesRemaining,
  getRemainingTiles,
  type ConnectionsGameState,
} from "@/domain/connections/gameplay";
import type { ConnectionsPuzzle } from "@/domain/connections/types";
import type { CurrentPlayer } from "@/server/players/getCurrentPlayer";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Json, Tables } from "@/types/database.generated";

const ATTEMPT_COLUMNS =
  "id, event_id, player_id, puzzle_id, tile_map, solved_group_ids, incorrect_guesses, version, created_at, updated_at, completed_at";
const ACTIVE_ATTEMPT_INDEX =
  "connections_attempts_one_active_per_player_puzzle_idx";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ConnectionsAttemptRow = Pick<
  Tables<"connections_attempts">,
  | "completed_at"
  | "created_at"
  | "event_id"
  | "id"
  | "incorrect_guesses"
  | "player_id"
  | "puzzle_id"
  | "solved_group_ids"
  | "tile_map"
  | "updated_at"
  | "version"
>;

type StoredTileMapping = {
  token: string;
  tileId: string;
};

type DecodedAttempt = {
  row: ConnectionsAttemptRow;
  state: ConnectionsGameState;
  tileMap: StoredTileMapping[];
};

type StartConnectionsAttemptInput = {
  player: CurrentPlayer;
  puzzleId: string;
  replayFromAttemptId?: string;
};

export type StartConnectionsAttemptResult =
  | { status: "ready"; attempt: ConnectionsAttemptSnapshot }
  | { status: "not_found" }
  | { status: "replay_not_complete"; attempt: ConnectionsAttemptSnapshot };

type SubmitConnectionsGuessInput = {
  player: CurrentPlayer;
  attemptId: string;
  tileIds: string[];
  version: number;
};

export type SubmitConnectionsGuessResult =
  | {
      status: "submitted";
      outcome: ConnectionsGuessOutcome;
      attempt: ConnectionsAttemptSnapshot;
    }
  | { status: "not_found" }
  | { status: "invalid_request" }
  | { status: "invalid_action"; attempt: ConnectionsAttemptSnapshot }
  | { status: "stale"; attempt: ConnectionsAttemptSnapshot };

export async function startConnectionsAttempt({
  player,
  puzzleId,
  replayFromAttemptId,
}: StartConnectionsAttemptInput): Promise<StartConnectionsAttemptResult> {
  const storedPuzzle = await getConnectionsPuzzleForEvent(
    player.eventId,
    puzzleId,
  );

  if (!storedPuzzle) {
    return { status: "not_found" };
  }

  if (replayFromAttemptId) {
    const replaySource = await loadAttempt({
      attemptId: replayFromAttemptId,
      eventId: player.eventId,
      playerId: player.id,
      puzzleId: storedPuzzle.databaseId,
    });

    if (!replaySource) {
      return { status: "not_found" };
    }

    const decodedReplaySource = decodeAttempt(
      replaySource,
      storedPuzzle.puzzle,
    );

    if (replaySource.completed_at === null) {
      return {
        status: "replay_not_complete",
        attempt: createSnapshot(decodedReplaySource, storedPuzzle.puzzle),
      };
    }

    const activeAttempt = await loadActiveAttempt(
      player,
      storedPuzzle.databaseId,
    );

    if (activeAttempt) {
      return {
        status: "ready",
        attempt: createSnapshot(
          decodeAttempt(activeAttempt, storedPuzzle.puzzle),
          storedPuzzle.puzzle,
        ),
      };
    }

    return createAttemptOrRecoverRace(player, storedPuzzle);
  }

  const activeAttempt = await loadActiveAttempt(
    player,
    storedPuzzle.databaseId,
  );

  if (activeAttempt) {
    return {
      status: "ready",
      attempt: createSnapshot(
        decodeAttempt(activeAttempt, storedPuzzle.puzzle),
        storedPuzzle.puzzle,
      ),
    };
  }

  const latestAttempt = await loadLatestAttempt(
    player,
    storedPuzzle.databaseId,
  );

  if (latestAttempt) {
    return {
      status: "ready",
      attempt: createSnapshot(
        decodeAttempt(latestAttempt, storedPuzzle.puzzle),
        storedPuzzle.puzzle,
      ),
    };
  }

  return createAttemptOrRecoverRace(player, storedPuzzle);
}

export async function submitConnectionsGuess({
  player,
  attemptId,
  tileIds,
  version,
}: SubmitConnectionsGuessInput): Promise<SubmitConnectionsGuessResult> {
  const attempt = await loadAttempt({
    attemptId,
    eventId: player.eventId,
    playerId: player.id,
  });

  if (!attempt) {
    return { status: "not_found" };
  }

  const storedPuzzle = await getConnectionsPuzzleByDatabaseIdForEvent(
    player.eventId,
    attempt.puzzle_id,
  );

  if (!storedPuzzle) {
    throw new Error("Failed to resolve the Connections Attempt puzzle.");
  }

  const decodedAttempt = decodeAttempt(attempt, storedPuzzle.puzzle);
  const currentSnapshot = createSnapshot(decodedAttempt, storedPuzzle.puzzle);

  if (version !== attempt.version) {
    return { status: "stale", attempt: currentSnapshot };
  }

  const internalTileIds = mapPublicTokensToInternalIds(
    tileIds,
    decodedAttempt.tileMap,
  );

  if (!internalTileIds) {
    return { status: "invalid_request" };
  }

  const result = evaluateGuess(
    storedPuzzle.puzzle,
    decodedAttempt.state,
    internalTileIds,
  );

  if (result.status === "invalid") {
    if (result.reason === "solved_tile" || result.reason === "game_over") {
      return { status: "invalid_action", attempt: currentSnapshot };
    }

    return { status: "invalid_request" };
  }

  if (result.status === "duplicate") {
    return {
      status: "submitted",
      outcome: "duplicate",
      attempt: currentSnapshot,
    };
  }

  const nextState = applyGuessResult(decodedAttempt.state, result);
  const nextGameStatus = getGameStatus(storedPuzzle.puzzle, nextState);
  const now = new Date().toISOString();
  const { data: updatedAttempt, error } = await getPrivilegedSupabaseClient()
    .from("connections_attempts")
    .update({
      completed_at: nextGameStatus === "playing" ? null : now,
      incorrect_guesses: nextState.incorrectGuesses,
      solved_group_ids: nextState.solvedGroupIds,
      updated_at: now,
      version: attempt.version + 1,
    })
    .eq("id", attempt.id)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("version", attempt.version)
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to update the Connections Attempt.");
  }

  if (!updatedAttempt) {
    const winningAttempt = await loadAttempt({
      attemptId: attempt.id,
      eventId: player.eventId,
      playerId: player.id,
    });

    if (!winningAttempt) {
      throw new Error("Failed to reload the Connections Attempt.");
    }

    return {
      status: "stale",
      attempt: createSnapshot(
        decodeAttempt(winningAttempt, storedPuzzle.puzzle),
        storedPuzzle.puzzle,
      ),
    };
  }

  const outcome: ConnectionsGuessOutcome =
    result.status === "correct"
      ? "correct"
      : result.oneAway
        ? "one_away"
        : "incorrect";

  return {
    status: "submitted",
    outcome,
    attempt: createSnapshot(
      decodeAttempt(updatedAttempt, storedPuzzle.puzzle),
      storedPuzzle.puzzle,
    ),
  };
}

async function createAttemptOrRecoverRace(
  player: CurrentPlayer,
  storedPuzzle: StoredConnectionsPuzzle,
): Promise<StartConnectionsAttemptResult> {
  const tileMap = createTileMap(storedPuzzle.puzzle);
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("connections_attempts")
    .insert({
      event_id: player.eventId,
      player_id: player.id,
      puzzle_id: storedPuzzle.databaseId,
      tile_map: tileMap,
    })
    .select(ATTEMPT_COLUMNS)
    .single();

  if (error) {
    if (!isActiveAttemptConflict(error)) {
      throw new Error("Failed to create the Connections Attempt.");
    }

    const activeAttempt = await loadActiveAttempt(
      player,
      storedPuzzle.databaseId,
    );

    if (!activeAttempt) {
      throw new Error("Failed to recover the active Connections Attempt.");
    }

    return {
      status: "ready",
      attempt: createSnapshot(
        decodeAttempt(activeAttempt, storedPuzzle.puzzle),
        storedPuzzle.puzzle,
      ),
    };
  }

  return {
    status: "ready",
    attempt: createSnapshot(
      decodeAttempt(data, storedPuzzle.puzzle),
      storedPuzzle.puzzle,
    ),
  };
}

async function loadActiveAttempt(
  player: CurrentPlayer,
  puzzleId: string,
): Promise<ConnectionsAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("connections_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("puzzle_id", puzzleId)
    .is("completed_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the active Connections Attempt.");
  }

  return data;
}

async function loadLatestAttempt(
  player: CurrentPlayer,
  puzzleId: string,
): Promise<ConnectionsAttemptRow | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("connections_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("event_id", player.eventId)
    .eq("player_id", player.id)
    .eq("puzzle_id", puzzleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the latest Connections Attempt.");
  }

  return data;
}

async function loadAttempt({
  attemptId,
  eventId,
  playerId,
  puzzleId,
}: {
  attemptId: string;
  eventId: string;
  playerId: string;
  puzzleId?: string;
}): Promise<ConnectionsAttemptRow | null> {
  let query = getPrivilegedSupabaseClient()
    .from("connections_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", attemptId)
    .eq("event_id", eventId)
    .eq("player_id", playerId);

  if (puzzleId) {
    query = query.eq("puzzle_id", puzzleId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error("Failed to load the Connections Attempt.");
  }

  return data;
}

function createTileMap(puzzle: ConnectionsPuzzle): StoredTileMapping[] {
  const shuffledTileIds = puzzle.groups.flatMap((group) =>
    group.tiles.map((tile) => tile.id),
  );

  for (let index = shuffledTileIds.length - 1; index > 0; index--) {
    const randomIndex = randomInt(index + 1);

    [shuffledTileIds[index], shuffledTileIds[randomIndex]] = [
      shuffledTileIds[randomIndex]!,
      shuffledTileIds[index]!,
    ];
  }

  return shuffledTileIds.map((tileId) => ({
    tileId,
    token: randomUUID(),
  }));
}

function decodeAttempt(
  row: ConnectionsAttemptRow,
  puzzle: ConnectionsPuzzle,
): DecodedAttempt {
  const tileMap = decodeTileMap(row.id, row.tile_map, puzzle);
  const state = decodeGameState(row, puzzle);
  const gameStatus = getGameStatus(puzzle, state);
  const isTerminal = gameStatus !== "playing";

  if ((row.completed_at !== null) !== isTerminal) {
    throw new Error(
      `Connections Attempt "${row.id}" has inconsistent terminal state.`,
    );
  }

  return { row, state, tileMap };
}

function decodeTileMap(
  attemptId: string,
  value: Json,
  puzzle: ConnectionsPuzzle,
): StoredTileMapping[] {
  if (!Array.isArray(value) || value.length !== 16) {
    throw new Error(
      `Connections Attempt "${attemptId}" has invalid tile data.`,
    );
  }

  const mappings = value.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.token !== "string" ||
      !UUID_PATTERN.test(entry.token) ||
      typeof entry.tileId !== "string"
    ) {
      throw new Error(
        `Connections Attempt "${attemptId}" has invalid tile data.`,
      );
    }

    return { token: entry.token, tileId: entry.tileId };
  });
  const tokens = new Set(mappings.map((entry) => entry.token));
  const tileIds = new Set(mappings.map((entry) => entry.tileId));
  const puzzleTileIds = new Set(
    puzzle.groups.flatMap((group) => group.tiles.map((tile) => tile.id)),
  );

  if (
    tokens.size !== mappings.length ||
    tileIds.size !== mappings.length ||
    tileIds.size !== puzzleTileIds.size ||
    [...tileIds].some((tileId) => !puzzleTileIds.has(tileId))
  ) {
    throw new Error(
      `Connections Attempt "${attemptId}" has invalid tile data.`,
    );
  }

  return mappings;
}

function decodeGameState(
  row: ConnectionsAttemptRow,
  puzzle: ConnectionsPuzzle,
): ConnectionsGameState {
  const groupIds = new Set(puzzle.groups.map((group) => group.id));
  const solvedGroupIds = row.solved_group_ids;

  if (
    !Array.isArray(solvedGroupIds) ||
    solvedGroupIds.some((groupId) => typeof groupId !== "string") ||
    new Set(solvedGroupIds).size !== solvedGroupIds.length ||
    solvedGroupIds.some((groupId) => !groupIds.has(groupId))
  ) {
    throw new Error(`Connections Attempt "${row.id}" has invalid game state.`);
  }

  if (!Array.isArray(row.incorrect_guesses)) {
    throw new Error(`Connections Attempt "${row.id}" has invalid game state.`);
  }

  const puzzleTileIds = new Set(
    puzzle.groups.flatMap((group) => group.tiles.map((tile) => tile.id)),
  );
  const incorrectGuesses = row.incorrect_guesses.map((guess) => {
    if (
      !Array.isArray(guess) ||
      guess.length !== 4 ||
      guess.some((tileId) => typeof tileId !== "string")
    ) {
      throw new Error(
        `Connections Attempt "${row.id}" has invalid game state.`,
      );
    }

    const tileIds = guess as string[];

    if (
      new Set(tileIds).size !== tileIds.length ||
      tileIds.some((tileId) => !puzzleTileIds.has(tileId))
    ) {
      throw new Error(
        `Connections Attempt "${row.id}" has invalid game state.`,
      );
    }

    return tileIds;
  });
  const normalizedGuesses = incorrectGuesses.map((guess) =>
    [...guess].sort().join("|"),
  );

  if (new Set(normalizedGuesses).size !== normalizedGuesses.length) {
    throw new Error(`Connections Attempt "${row.id}" has invalid game state.`);
  }

  return { solvedGroupIds, incorrectGuesses };
}

function createSnapshot(
  attempt: DecodedAttempt,
  puzzle: ConnectionsPuzzle,
): ConnectionsAttemptSnapshot {
  const tokenByTileId = new Map(
    attempt.tileMap.map(({ tileId, token }) => [tileId, token]),
  );
  const tileById = new Map(
    puzzle.groups.flatMap((group) =>
      group.tiles.map((tile) => [tile.id, tile] as const),
    ),
  );
  const gameStatus = getGameStatus(puzzle, attempt.state);
  const remainingTileIds = new Set(
    getRemainingTiles(puzzle, attempt.state).map((tile) => tile.id),
  );
  const remainingTiles =
    gameStatus === "playing"
      ? attempt.tileMap
          .filter(({ tileId }) => remainingTileIds.has(tileId))
          .map(({ tileId, token }) => ({
            id: token,
            label: tileById.get(tileId)!.label,
          }))
      : [];
  const displayedGroups = puzzle.groups
    .filter(
      (group) =>
        gameStatus === "lost" ||
        attempt.state.solvedGroupIds.includes(group.id),
    )
    .map((group) => ({
      category: group.category,
      tiles: group.tiles.map((tile) => ({
        id: tokenByTileId.get(tile.id)!,
        label: tile.label,
      })),
    }));

  return {
    attemptId: attempt.row.id,
    version: attempt.row.version,
    remainingTiles,
    displayedGroups,
    mistakesRemaining: getMistakesRemaining(attempt.state),
    gameStatus,
  };
}

function mapPublicTokensToInternalIds(
  tokens: string[],
  tileMap: StoredTileMapping[],
): string[] | null {
  if (tokens.length !== 4 || new Set(tokens).size !== tokens.length) {
    return null;
  }

  const tileIdByToken = new Map(
    tileMap.map(({ tileId, token }) => [token, tileId]),
  );
  const internalTileIds = tokens.map((token) => tileIdByToken.get(token));

  return internalTileIds.every((tileId): tileId is string => Boolean(tileId))
    ? internalTileIds
    : null;
}

function isActiveAttemptConflict(error: {
  code?: string;
  details?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23505" &&
    `${error.message ?? ""} ${error.details ?? ""}`.includes(
      ACTIVE_ATTEMPT_INDEX,
    )
  );
}

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
