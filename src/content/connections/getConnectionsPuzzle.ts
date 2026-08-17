import type { ConnectionsPuzzle } from "@/domain/connections/types";
import { validateConnectionsPuzzle } from "@/domain/connections/validation";

import { developmentPuzzle } from "./developmentPuzzle";

const localConnectionsPuzzles: ConnectionsPuzzle[] = [developmentPuzzle];

export async function getConnectionsPuzzle(
  puzzleId: string,
): Promise<ConnectionsPuzzle | null> {
  const puzzle =
    localConnectionsPuzzles.find((candidate) => candidate.id === puzzleId) ??
    null;

  if (!puzzle) {
    return null;
  }

  const validationErrors = validateConnectionsPuzzle(puzzle);

  if (validationErrors.length > 0) {
    throw new Error(
      `Connections puzzle "${puzzleId}" failed validation: ${validationErrors.join("; ")}`,
    );
  }

  return puzzle;
}
