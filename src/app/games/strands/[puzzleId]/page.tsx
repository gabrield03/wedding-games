import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getStrandsPuzzle } from "@/content/strands/getStrandsPuzzle";
import { StrandsGameBoard } from "@/features/strands/StrandsGameBoard";

export default async function StrandsPuzzlePage({
  params,
}: PageProps<"/games/strands/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getStrandsPuzzle(puzzleId);

  if (!puzzle) {
    notFound();
  }

  return (
    <GamePageShell>
      <StrandsGameBoard puzzle={puzzle} />
    </GamePageShell>
  );
}
