import {
  isStrandsPuzzleId,
  type StrandsPuzzleId,
} from "@/content/strands/puzzleIds";

const LAST_VISITED_PUZZLE_KEY = "wedding-games:strands:last-visited";

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
    // Navigation metadata is best-effort. Gameplay state lives on the server.
  }
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
