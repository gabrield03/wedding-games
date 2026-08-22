import { notFound } from "next/navigation";

import { GamePageShell } from "@/components/GamePageShell";
import { getWordlePuzzlePreview } from "@/content/wordle/getWordlePuzzle";
import { WordleGameBoard } from "@/features/wordle/WordleGameBoard";

export default async function WordlePuzzlePage({
  params,
  searchParams,
}: PageProps<"/games/wordle/[puzzleId]">) {
  const [{ puzzleId }, query] = await Promise.all([params, searchParams]);
  const puzzle = await getWordlePuzzlePreview(puzzleId);

  if (!puzzle) {
    notFound();
  }

  const startMode = query.start === "new" ? "new" : "resume";
  const initializationRequest =
    startMode === "new" && typeof query.request === "string"
      ? query.request
      : startMode;
  const canonicalHref = `/games/wordle/${encodeURIComponent(puzzle.id)}`;

  return (
    <GamePageShell>
      <WordleGameBoard
        key={`${puzzle.id}:${startMode}:${initializationRequest}`}
        puzzle={puzzle}
        startMode={startMode}
        initializationRequest={initializationRequest}
        canonicalHref={canonicalHref}
        nextWordHref={`/games/wordle?exclude=${encodeURIComponent(puzzle.id)}`}
      />
    </GamePageShell>
  );
}
