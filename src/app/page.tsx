import { notFound } from "next/navigation";

import { getConnectionsPuzzle } from "@/content/connections/getConnectionsPuzzle";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

export default async function Home() {
  const puzzle = await getConnectionsPuzzle("development-puzzle");

  if (!puzzle) {
    notFound();
  }

  return <ConnectionsGameBoard puzzle={puzzle} />;
}
