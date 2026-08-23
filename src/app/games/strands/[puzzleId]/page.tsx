import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getStrandsPuzzle } from "@/content/strands/getStrandsPuzzle";
import { getNextStrandsPuzzleId } from "@/content/strands/puzzleIds";
import { StrandsGameBoard } from "@/features/strands/StrandsGameBoard";

export default async function StrandsPuzzlePage({
  params,
}: PageProps<"/games/strands/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getStrandsPuzzle(puzzleId);
  const nextPuzzleId = getNextStrandsPuzzleId(puzzleId);

  if (!puzzle || !nextPuzzleId) {
    notFound();
  }

  return (
    <GamePageShell>
      <StrandsGameBoard
        key={puzzle.id}
        puzzle={puzzle}
        nextPuzzleId={nextPuzzleId}
      />
    </GamePageShell>
  );
}
