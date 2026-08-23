import "server-only";

import type { StrandsPuzzle } from "@/domain/strands/types";
import { validateStrandsPuzzle } from "@/domain/strands/validation";

import { strandsPuzzles } from "./puzzles";

export async function getStrandsPuzzle(
  puzzleId: string,
): Promise<StrandsPuzzle | null> {
  const puzzle = strandsPuzzles.find(({ id }) => id === puzzleId);

  if (!puzzle) {
    return null;
  }

  const validationErrors = validateStrandsPuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Strands puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}
