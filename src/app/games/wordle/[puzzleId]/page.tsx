import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getWordlePuzzle } from "@/content/wordle/getWordlePuzzle";
import { WordleGameBoard } from "@/features/wordle/WordleGameBoard";

export default async function WordlePuzzlePage({
  params,
}: PageProps<"/games/wordle/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getWordlePuzzle(puzzleId);

  if (!puzzle) {
    notFound();
  }

  return (
    <GamePageShell>
      <WordleGameBoard puzzle={puzzle} />
    </GamePageShell>
  );
}
