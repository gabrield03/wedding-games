import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getMiniCrosswordPuzzle } from "@/content/miniCrossword/getMiniCrosswordPuzzle";
import { MiniCrosswordGameBoard } from "@/features/miniCrossword/MiniCrosswordGameBoard";

export default async function MiniCrosswordPuzzlePage({
  params,
}: PageProps<"/games/mini-crossword/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getMiniCrosswordPuzzle(puzzleId);

  if (!puzzle) {
    notFound();
  }

  return (
    <GamePageShell>
      <MiniCrosswordGameBoard key={puzzle.id} puzzle={puzzle} />
    </GamePageShell>
  );
}
