import { redirect } from "next/navigation";
import { connection } from "next/server";

import { selectRandomWordlePuzzleId } from "@/content/wordle/selectRandomWordlePuzzleId";

export default async function WordleEntryPage({
  searchParams,
}: PageProps<"/games/wordle">) {
  await connection();

  const { exclude } = await searchParams;
  const excludedPuzzleId = typeof exclude === "string" ? exclude : undefined;
  const puzzleId = await selectRandomWordlePuzzleId(excludedPuzzleId);

  redirect(`/games/wordle/${puzzleId}`);
}
