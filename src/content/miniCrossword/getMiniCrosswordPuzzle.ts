import "server-only";

import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";
import { validateMiniCrosswordPuzzle } from "@/domain/miniCrossword/validation";

import { miniCrosswordPuzzles } from "./puzzles";

export async function getMiniCrosswordPuzzle(
  puzzleId: string,
): Promise<MiniCrosswordPuzzle | null> {
  const puzzle = miniCrosswordPuzzles.find(({ id }) => id === puzzleId);

  if (!puzzle) {
    return null;
  }

  const validationErrors = validateMiniCrosswordPuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Mini Crossword puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}
