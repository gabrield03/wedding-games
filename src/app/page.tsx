import { developmentPuzzle } from "@/content/connections/developmentPuzzle";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

export default function Home() {
  return <ConnectionsGameBoard puzzle={developmentPuzzle} />;
}
