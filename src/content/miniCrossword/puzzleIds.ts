export const MINI_CROSSWORD_PUZZLE_IDS = ["wedding-01", "wedding-02"] as const;

export type MiniCrosswordPuzzleId = (typeof MINI_CROSSWORD_PUZZLE_IDS)[number];

export function isMiniCrosswordPuzzleId(
  puzzleId: string,
): puzzleId is MiniCrosswordPuzzleId {
  return MINI_CROSSWORD_PUZZLE_IDS.some((id) => id === puzzleId);
}

export function getNextMiniCrosswordPuzzleId(
  puzzleId: string,
): MiniCrosswordPuzzleId | null {
  const currentIndex = MINI_CROSSWORD_PUZZLE_IDS.findIndex(
    (id) => id === puzzleId,
  );

  if (currentIndex < 0) {
    return null;
  }

  return MINI_CROSSWORD_PUZZLE_IDS[
    (currentIndex + 1) % MINI_CROSSWORD_PUZZLE_IDS.length
  ]!;
}
