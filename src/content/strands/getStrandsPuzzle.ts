import "server-only";

import type { StrandsAnswer, StrandsPuzzle } from "@/domain/strands/types";
import { validateStrandsPuzzle } from "@/domain/strands/validation";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Json, Tables } from "@/types/database.generated";

export type StoredStrandsPuzzleRow = Pick<
  Tables<"strands_puzzles">,
  | "event_id"
  | "grid_columns"
  | "grid_letters"
  | "grid_rows"
  | "id"
  | "public_id"
  | "spangram"
  | "theme_clue"
  | "theme_words"
>;

export type StoredStrandsPuzzle = {
  databaseId: string;
  eventId: string;
  puzzle: StrandsPuzzle;
};

export async function getStrandsPuzzle(
  puzzleId: string,
): Promise<StrandsPuzzle | null> {
  const event = await getCurrentEvent();
  const storedPuzzle = await getStrandsPuzzleForEvent(event.id, puzzleId);

  return storedPuzzle?.puzzle ?? null;
}

export async function getStrandsPuzzleForEvent(
  eventId: string,
  puzzleId: string,
): Promise<StoredStrandsPuzzle | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("strands_puzzles")
    .select(
      "id, event_id, public_id, theme_clue, grid_rows, grid_columns, grid_letters, theme_words, spangram",
    )
    .eq("event_id", eventId)
    .eq("public_id", puzzleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Strands puzzle "${puzzleId}".`, {
      cause: error,
    });
  }

  if (!data) {
    return null;
  }

  return decodeStoredStrandsPuzzle(data);
}

export function decodeStoredStrandsPuzzle(
  row: StoredStrandsPuzzleRow,
): StoredStrandsPuzzle {
  const puzzle: StrandsPuzzle = {
    id: row.public_id,
    themeClue: row.theme_clue,
    grid: {
      rows: row.grid_rows,
      columns: row.grid_columns,
      letters: row.grid_letters,
    },
    themeWords: decodeAnswers(row.public_id, "theme words", row.theme_words),
    spangram: decodeAnswer(row.public_id, "spangram", row.spangram),
  };
  const validationErrors = validateStrandsPuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Strands puzzle "${row.public_id}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return {
    databaseId: row.id,
    eventId: row.event_id,
    puzzle,
  };
}

function decodeAnswers(
  puzzleId: string,
  label: string,
  value: Json,
): StrandsAnswer[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Strands puzzle "${puzzleId}" has invalid stored ${label}.`,
    );
  }

  return value.map((answer, index) =>
    decodeAnswer(puzzleId, `${label} entry ${index + 1}`, answer),
  );
}

function decodeAnswer(
  puzzleId: string,
  label: string,
  value: Json,
): StrandsAnswer {
  if (
    !isRecord(value) ||
    typeof value.word !== "string" ||
    !Array.isArray(value.path) ||
    value.path.some(
      (tileIndex) =>
        typeof tileIndex !== "number" || !Number.isInteger(tileIndex),
    )
  ) {
    throw new Error(
      `Strands puzzle "${puzzleId}" has invalid stored ${label}.`,
    );
  }

  return {
    word: value.word,
    path: value.path as number[],
  };
}

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
