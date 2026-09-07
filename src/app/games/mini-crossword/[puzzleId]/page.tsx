import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getMiniCrosswordPuzzle } from "@/content/miniCrossword/getMiniCrosswordPuzzle";
import { getNextMiniCrosswordPuzzleId } from "@/content/miniCrossword/puzzleIds";
import { MiniCrosswordGameBoard } from "@/features/miniCrossword/MiniCrosswordGameBoard";

export default async function MiniCrosswordPuzzlePage({
  params,
}: PageProps<"/games/mini-crossword/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getMiniCrosswordPuzzle(puzzleId);
  const nextPuzzleId = getNextMiniCrosswordPuzzleId(puzzleId);

  if (!puzzle || !nextPuzzleId) {
    notFound();
  }

  return (
    <GamePageShell>
      <MiniCrosswordGameBoard
        key={puzzle.id}
        puzzle={puzzle}
        nextPuzzleId={nextPuzzleId}
      />
    </GamePageShell>
  );
}
