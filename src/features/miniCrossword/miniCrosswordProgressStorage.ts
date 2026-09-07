import {
  isMiniCrosswordPuzzleId,
  type MiniCrosswordPuzzleId,
} from "@/content/miniCrossword/puzzleIds";
import {
  MINI_CROSSWORD_BLOCK,
  type MiniCrosswordGameState,
  type MiniCrosswordPuzzle,
} from "@/domain/miniCrossword/types";

const MINI_CROSSWORD_PROGRESS_VERSION = 1;
const LAST_VISITED_PUZZLE_KEY =
  "wedding-games:mini-crossword:last-visited";
const PUZZLE_PROGRESS_KEY_PREFIX =
  "wedding-games:mini-crossword:progress:";

export type PersistedMiniCrosswordProgress = {
  version: typeof MINI_CROSSWORD_PROGRESS_VERSION;
  letters: Array<string | null>;
  status: MiniCrosswordGameState["status"];
};

export function loadMiniCrosswordPuzzleProgress(
  puzzle: MiniCrosswordPuzzle,
): PersistedMiniCrosswordProgress | null {
  const rawValue = readStorageValue(getPuzzleProgressKey(puzzle.id));

  if (!rawValue) {
    return null;
  }

  try {
    return validatePersistedProgress(puzzle, JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function saveMiniCrosswordPuzzleProgress(
  puzzle: MiniCrosswordPuzzle,
  state: MiniCrosswordGameState,
) {
  const candidate: PersistedMiniCrosswordProgress = {
    version: MINI_CROSSWORD_PROGRESS_VERSION,
    letters: state.letters,
    status: state.status,
  };
  const validated = validatePersistedProgress(puzzle, candidate);
  const storage = getBrowserStorage();

  if (!storage || !validated) {
    return;
  }

  const key = getPuzzleProgressKey(puzzle.id);

  try {
    if (
      validated.status === "playing" &&
      validated.letters.every((letter) => letter === null)
    ) {
      storage.removeItem(key);
      return;
    }

    storage.setItem(key, JSON.stringify(validated));
  } catch {
    // Browser storage is best-effort. Gameplay remains available.
  }
}

export function clearMiniCrosswordPuzzleProgress(puzzleId: string) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(getPuzzleProgressKey(puzzleId));
  } catch {
    // Browser storage is best-effort. Gameplay remains available.
  }
}

export function loadLastVisitedMiniCrosswordPuzzleId():
  | MiniCrosswordPuzzleId
  | null {
  const puzzleId = readStorageValue(LAST_VISITED_PUZZLE_KEY);

  return puzzleId && isMiniCrosswordPuzzleId(puzzleId) ? puzzleId : null;
}

export function saveLastVisitedMiniCrosswordPuzzleId(puzzleId: string) {
  if (!isMiniCrosswordPuzzleId(puzzleId)) {
    return;
  }

  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAST_VISITED_PUZZLE_KEY, puzzleId);
  } catch {
    // Browser storage is best-effort. Gameplay remains available.
  }
}

function validatePersistedProgress(
  puzzle: MiniCrosswordPuzzle,
  value: unknown,
): PersistedMiniCrosswordProgress | null {
  if (
    !isRecord(value) ||
    value.version !== MINI_CROSSWORD_PROGRESS_VERSION ||
    !Array.isArray(value.letters) ||
    (value.status !== "playing" && value.status !== "complete")
  ) {
    return null;
  }

  if (value.letters.length !== puzzle.grid.rows * puzzle.grid.columns) {
    return null;
  }

  const letters = value.letters;

  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      const index = row * puzzle.grid.columns + column;
      const solutionCharacter = puzzle.grid.solution[row]![column]!;
      const letter = letters[index];

      if (solutionCharacter === MINI_CROSSWORD_BLOCK) {
        if (letter !== null) {
          return null;
        }
        continue;
      }

      if (
        letter !== null &&
        (typeof letter !== "string" || !/^[A-Z]$/.test(letter))
      ) {
        return null;
      }
    }
  }

  if (
    value.status === "complete" &&
    !lettersMatchSolution(puzzle, letters)
  ) {
    return null;
  }

  return {
    version: MINI_CROSSWORD_PROGRESS_VERSION,
    letters: [...letters],
    status: value.status,
  };
}

function lettersMatchSolution(
  puzzle: MiniCrosswordPuzzle,
  letters: Array<string | null>,
): boolean {
  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      const solutionCharacter = puzzle.grid.solution[row]![column]!;

      if (solutionCharacter === MINI_CROSSWORD_BLOCK) {
        continue;
      }

      const index = row * puzzle.grid.columns + column;

      if (letters[index] !== solutionCharacter) {
        return false;
      }
    }
  }

  return true;
}

function getPuzzleProgressKey(puzzleId: string) {
  return `${PUZZLE_PROGRESS_KEY_PREFIX}${puzzleId}`;
}

function readStorageValue(key: string): string | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
