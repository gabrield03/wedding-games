import { notFound } from "next/navigation";

import { getConnectionsPuzzle } from "@/content/connections/getConnectionsPuzzle";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

export default async function ConnectionsPuzzlePage({
  params,
}: PageProps<"/games/connections/[puzzleId]">) {
  const { puzzleId } = await params;
  const puzzle = await getConnectionsPuzzle(puzzleId);

  if (!puzzle) {
    notFound();
  }

  return <ConnectionsGameBoard puzzle={puzzle} />;
}
