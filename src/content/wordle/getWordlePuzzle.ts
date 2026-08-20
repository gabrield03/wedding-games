import "server-only";

import type { WordlePuzzle } from "@/domain/wordle/types";
import { validateWordlePuzzle } from "@/domain/wordle/validation";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

type WordlePuzzleRow = Pick<Tables<"wordle_puzzles">, "public_id" | "answer">;

function mapWordlePuzzle(puzzleId: string, row: WordlePuzzleRow): WordlePuzzle {
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
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_puzzles")
    .select("public_id, answer")
    .eq("event_id", event.id)
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

  return mapWordlePuzzle(puzzleId, data);
}
