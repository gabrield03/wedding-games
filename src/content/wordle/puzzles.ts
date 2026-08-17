import type { WordlePuzzle } from "@/domain/wordle/types";

const localWordlePuzzles: WordlePuzzle[] = [
  { id: "wedding-01", answer: "BRIDE" },
  { id: "wedding-02", answer: "GROOM" },
  { id: "wedding-03", answer: "AISLE" },
  { id: "wedding-04", answer: "RINGS" },
  { id: "wedding-05", answer: "DANCE" },
  { id: "wedding-06", answer: "TOAST" },
  { id: "wedding-07", answer: "HEART" },
  { id: "wedding-08", answer: "PARTY" },
  { id: "wedding-09", answer: "ALTAR" },
  { id: "wedding-10", answer: "HONEY" },
];

export function findLocalWordlePuzzle(puzzleId: string): WordlePuzzle | null {
  return (
    localWordlePuzzles.find((candidate) => candidate.id === puzzleId) ?? null
  );
}

export function selectRandomWordlePuzzleId(excludedPuzzleId?: string): string {
  const eligiblePuzzles = localWordlePuzzles.filter(
    (puzzle) => puzzle.id !== excludedPuzzleId,
  );

  if (eligiblePuzzles.length === 0) {
    throw new Error("No eligible Wordle puzzles are available");
  }

  const selectedIndex = Math.floor(Math.random() * eligiblePuzzles.length);

  return eligiblePuzzles[selectedIndex]!.id;
}
