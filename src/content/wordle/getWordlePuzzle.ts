import type { WordlePuzzle } from "@/domain/wordle/types";
import { validateWordlePuzzle } from "@/domain/wordle/validation";

import { findLocalWordlePuzzle } from "./puzzles";

export async function getWordlePuzzle(
  puzzleId: string,
): Promise<WordlePuzzle | null> {
  const puzzle = findLocalWordlePuzzle(puzzleId);

  if (!puzzle) {
    return null;
  }

  const validationErrors = validateWordlePuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Wordle puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}
