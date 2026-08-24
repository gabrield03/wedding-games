import {
  isStrandsPuzzleId,
  type StrandsPuzzleId,
} from "@/content/strands/puzzleIds";
import type { StrandsPuzzle } from "@/domain/strands/types";

const STRANDS_PROGRESS_VERSION = 1;
const LAST_VISITED_PUZZLE_KEY = "wedding-games:strands:last-visited";
const PUZZLE_PROGRESS_KEY_PREFIX = "wedding-games:strands:progress:";

export type PersistedStrandsProgress = {
  version: typeof STRANDS_PROGRESS_VERSION;
  foundWords: string[];
  hintedWord: string | null;
};

type SaveStrandsProgressInput = Omit<PersistedStrandsProgress, "version">;

export function loadStrandsPuzzleProgress(
  puzzle: StrandsPuzzle,
): PersistedStrandsProgress | null {
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

export function saveStrandsPuzzleProgress(
  puzzle: StrandsPuzzle,
  progress: SaveStrandsProgressInput,
) {
  const candidate: PersistedStrandsProgress = {
    version: STRANDS_PROGRESS_VERSION,
    foundWords: progress.foundWords,
    hintedWord: progress.hintedWord,
  };
  const validated = validatePersistedProgress(puzzle, candidate);
  const storage = getBrowserStorage();

  if (!storage || !validated) {
    return;
  }

  const key = getPuzzleProgressKey(puzzle.id);

  try {
    if (validated.foundWords.length === 0 && validated.hintedWord === null) {
      storage.removeItem(key);
      return;
    }

    storage.setItem(key, JSON.stringify(validated));
  } catch {
    // Browser storage is best-effort for M7. Gameplay remains available.
  }
}

export function clearStrandsPuzzleProgress(puzzleId: string) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(getPuzzleProgressKey(puzzleId));
  } catch {
    // Browser storage is best-effort for M7. Gameplay remains available.
  }
}

export function loadLastVisitedStrandsPuzzleId(): StrandsPuzzleId | null {
  const puzzleId = readStorageValue(LAST_VISITED_PUZZLE_KEY);

  return puzzleId && isStrandsPuzzleId(puzzleId) ? puzzleId : null;
}

export function saveLastVisitedStrandsPuzzleId(puzzleId: string) {
  if (!isStrandsPuzzleId(puzzleId)) {
    return;
  }

  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAST_VISITED_PUZZLE_KEY, puzzleId);
  } catch {
    // Browser storage is best-effort for M7. Gameplay remains available.
  }
}

function validatePersistedProgress(
  puzzle: StrandsPuzzle,
  value: unknown,
): PersistedStrandsProgress | null {
  if (!isRecord(value) || value.version !== STRANDS_PROGRESS_VERSION) {
    return null;
  }

  if (!Array.isArray(value.foundWords)) {
    return null;
  }

  const validAnswers = new Set([
    ...puzzle.themeWords.map(({ word }) => word),
    puzzle.spangram.word,
  ]);
  const foundWords = value.foundWords;

  if (
    !foundWords.every(
      (word): word is string =>
        typeof word === "string" && validAnswers.has(word),
    ) ||
    new Set(foundWords).size !== foundWords.length
  ) {
    return null;
  }

  const hintedWord = value.hintedWord;

  if (hintedWord !== null) {
    if (typeof hintedWord !== "string") {
      return null;
    }

    const themeWords = new Set(puzzle.themeWords.map(({ word }) => word));

    if (!themeWords.has(hintedWord) || foundWords.includes(hintedWord)) {
      return null;
    }
  }

  return {
    version: STRANDS_PROGRESS_VERSION,
    foundWords: [...foundWords],
    hintedWord,
  };
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
