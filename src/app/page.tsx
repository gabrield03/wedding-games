import { developmentPuzzle } from "@/domain/connections/fixtures";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

export default function Home() {
  return <ConnectionsGameBoard puzzle={developmentPuzzle} />;
}
