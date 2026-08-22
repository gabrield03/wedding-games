import "server-only";

import type { WordlePuzzlePreview } from "@/contracts/wordle";
import type { WordlePuzzle } from "@/domain/wordle/types";
import { validateWordlePuzzle } from "@/domain/wordle/validation";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

export type StoredWordlePuzzleRow = Pick<
  Tables<"wordle_puzzles">,
  "answer" | "event_id" | "id" | "public_id"
>;

export type StoredWordlePuzzle = {
  databaseId: string;
  eventId: string;
  puzzle: WordlePuzzle;
};

function mapWordlePuzzle(
  puzzleId: string,
  row: Pick<StoredWordlePuzzleRow, "answer" | "public_id">,
): WordlePuzzle {
  const puzzle: WordlePuzzle = {
    id: row.public_id,
    answer: row.answer,
  };

  const validationErrors = validateWordlePuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Wordle puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}

export async function getWordlePuzzle(
  puzzleId: string,
): Promise<WordlePuzzle | null> {
  const event = await getCurrentEvent();
  const storedPuzzle = await getWordlePuzzleForEvent(event.id, puzzleId);

  return storedPuzzle?.puzzle ?? null;
}

export async function getWordlePuzzlePreview(
  puzzleId: string,
): Promise<WordlePuzzlePreview | null> {
  const event = await getCurrentEvent();
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_puzzles")
    .select("public_id")
    .eq("event_id", event.id)
    .eq("public_id", puzzleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Wordle puzzle "${puzzleId}".`);
  }

  return data ? { id: data.public_id } : null;
}

export async function getWordlePuzzleForEvent(
  eventId: string,
  puzzleId: string,
): Promise<StoredWordlePuzzle | null> {
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_puzzles")
    .select("id, event_id, public_id, answer")
    .eq("event_id", eventId)
    .eq("public_id", puzzleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Wordle puzzle "${puzzleId}".`, {
      cause: error,
    });
  }

  if (!data) {
    return null;
  }

  return decodeStoredWordlePuzzle(data);
}

export function decodeStoredWordlePuzzle(
  row: StoredWordlePuzzleRow,
): StoredWordlePuzzle {
  return {
    databaseId: row.id,
    eventId: row.event_id,
    puzzle: mapWordlePuzzle(row.public_id, row),
  };
}
