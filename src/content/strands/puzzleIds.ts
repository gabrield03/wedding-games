export const STRANDS_PUZZLE_IDS = [
  "wedding-01",
  "wedding-02",
  "wedding-03",
  "wedding-04",
] as const;

export type StrandsPuzzleId = (typeof STRANDS_PUZZLE_IDS)[number];

export function getNextStrandsPuzzleId(
  puzzleId: string,
): StrandsPuzzleId | null {
  const currentIndex = STRANDS_PUZZLE_IDS.findIndex((id) => id === puzzleId);

  if (currentIndex < 0) {
    return null;
  }

  return STRANDS_PUZZLE_IDS[(currentIndex + 1) % STRANDS_PUZZLE_IDS.length]!;
}
