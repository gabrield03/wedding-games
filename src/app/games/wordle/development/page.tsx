import { GamePageShell } from "@/components/GamePageShell";
import type { WordlePuzzle } from "@/domain/wordle/types";
import { WordleGameBoard } from "@/features/wordle/WordleGameBoard";

const developmentPuzzle: WordlePuzzle = {
  id: "development-wordle",
  answer: "CRANE",
};

export default function DevelopmentWordlePage() {
  return (
    <GamePageShell>
      <WordleGameBoard puzzle={developmentPuzzle} />
    </GamePageShell>
  );
}
