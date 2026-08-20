import "server-only";

import type { ConnectionsPuzzle } from "@/domain/connections/types";
import { validateConnectionsPuzzle } from "@/domain/connections/validation";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Json, Tables } from "@/types/database.generated";

type ConnectionsPuzzleRow = Pick<
  Tables<"connections_puzzles">,
  "public_id" | "title" | "groups"
>;

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeConnectionsGroups(
  puzzleId: string,
  value: Json,
): ConnectionsPuzzle["groups"] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Connections puzzle "${puzzleId}" has invalid stored content: groups must be an array.`,
    );
  }

  return value.map((group, groupIndex) => {
    if (!isRecord(group)) {
      throw new Error(
        `Connections puzzle "${puzzleId}" has invalid stored content: group ${groupIndex + 1} must be an object.`,
      );
    }

    if (typeof group.id !== "string" || typeof group.category !== "string") {
      throw new Error(
        `Connections puzzle "${puzzleId}" has invalid stored content: group ${groupIndex + 1} must have string id and category values.`,
      );
    }

    if (!Array.isArray(group.tiles)) {
      throw new Error(
        `Connections puzzle "${puzzleId}" has invalid stored content: group ${groupIndex + 1} tiles must be an array.`,
      );
    }

    const tiles = group.tiles.map((tile, tileIndex) => {
      if (
        !isRecord(tile) ||
        typeof tile.id !== "string" ||
        typeof tile.label !== "string"
      ) {
        throw new Error(
          `Connections puzzle "${puzzleId}" has invalid stored content: tile ${tileIndex + 1} in group ${groupIndex + 1} must have string id and label values.`,
        );
      }

      return { id: tile.id, label: tile.label };
    });

    return { id: group.id, category: group.category, tiles };
  });
}

function decodeConnectionsPuzzle(
  puzzleId: string,
  row: ConnectionsPuzzleRow,
): ConnectionsPuzzle {
  const puzzle: ConnectionsPuzzle = {
    id: row.public_id,
    title: row.title,
    groups: decodeConnectionsGroups(puzzleId, row.groups),
  };

  const validationErrors = validateConnectionsPuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Connections puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}

export async function getConnectionsPuzzle(
  puzzleId: string,
): Promise<ConnectionsPuzzle | null> {
  const event = await getCurrentEvent();
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("connections_puzzles")
    .select("public_id, title, groups")
    .eq("event_id", event.id)
    .eq("public_id", puzzleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Connections puzzle "${puzzleId}".`, {
      cause: error,
    });
  }

  if (!data) {
    return null;
  }

  return decodeConnectionsPuzzle(puzzleId, data);
}
