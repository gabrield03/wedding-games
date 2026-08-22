import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getConnectionsPuzzlePreview } from "@/content/connections/getConnectionsPuzzle";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

export default async function ConnectionsPuzzlePage({
  params,
}: PageProps<"/games/connections/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getConnectionsPuzzlePreview(puzzleId);

  if (!puzzle) {
    notFound();
  }

  return (
    <GamePageShell>
      <ConnectionsGameBoard puzzle={puzzle} />
    </GamePageShell>
  );
}
