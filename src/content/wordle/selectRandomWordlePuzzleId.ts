import "server-only";

import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";

export async function selectRandomWordlePuzzleId(
  excludedPuzzleId?: string,
): Promise<string> {
  const event = await getCurrentEvent();
  const { data, error } = await getPrivilegedSupabaseClient()
    .from("wordle_puzzles")
    .select("public_id")
    .eq("event_id", event.id);

  if (error) {
    throw new Error(
      `Failed to select a Wordle puzzle for configured Event "${event.slug}".`,
      { cause: error },
    );
  }

  const puzzleIds = (data ?? []).map(({ public_id }) => public_id);

  if (puzzleIds.length === 0) {
    throw new Error(
      `No Wordle puzzles are available for configured Event "${event.slug}".`,
    );
  }

  const alternatives = excludedPuzzleId
    ? puzzleIds.filter((puzzleId) => puzzleId !== excludedPuzzleId)
    : puzzleIds;
  const eligiblePuzzleIds = alternatives.length > 0 ? alternatives : puzzleIds;
  const selectedIndex = Math.floor(Math.random() * eligiblePuzzleIds.length);

  return eligiblePuzzleIds[selectedIndex]!;
}
