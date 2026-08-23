import {
  STRANDS_GRID_COLUMNS,
  STRANDS_MIN_WORD_LENGTH,
  STRANDS_TILE_COUNT,
  type StrandsAnswer,
  type StrandsGameState,
  type StrandsGameStatus,
  type StrandsPath,
  type StrandsPuzzle,
} from "@/domain/strands/types";

type FoundAnswerResult = {
  word: string;
  state: StrandsGameState;
};

export type StrandsSubmissionResult =
  | ({ status: "found_theme" } & FoundAnswerResult)
  | ({ status: "found_spangram" } & FoundAnswerResult)
  | ({ status: "already_found" } & FoundAnswerResult)
  | {
      status: "game_complete";
      state: StrandsGameState;
      completedBy?: {
        word: string;
        answerKind: "theme" | "spangram";
      };
    }
  | {
      status: "not_theme" | "invalid_path";
      state: StrandsGameState;
    };

export function createInitialStrandsGameState(): StrandsGameState {
  return {
    selectedPath: [],
    foundWords: [],
  };
}

export function getStrandsGameStatus(
  puzzle: StrandsPuzzle,
  state: StrandsGameState,
): StrandsGameStatus {
  const requiredWords = getStrandsAnswers(puzzle).map(({ word }) => word);

  return requiredWords.every((word) => state.foundWords.includes(word))
    ? "complete"
    : "playing";
}

export function areStrandsTilesAdjacent(
  firstIndex: number,
  secondIndex: number,
  columns = STRANDS_GRID_COLUMNS,
): boolean {
  if (
    !Number.isInteger(firstIndex) ||
    !Number.isInteger(secondIndex) ||
    !Number.isInteger(columns) ||
    columns <= 0 ||
    firstIndex < 0 ||
    secondIndex < 0 ||
    firstIndex >= STRANDS_TILE_COUNT ||
    secondIndex >= STRANDS_TILE_COUNT ||
    firstIndex === secondIndex
  ) {
    return false;
  }

  const firstRow = Math.floor(firstIndex / columns);
  const firstColumn = firstIndex % columns;
  const secondRow = Math.floor(secondIndex / columns);
  const secondColumn = secondIndex % columns;

  return (
    Math.abs(firstRow - secondRow) <= 1 &&
    Math.abs(firstColumn - secondColumn) <= 1
  );
}

export function getStrandsPathWord(
  puzzle: StrandsPuzzle,
  path: StrandsPath,
): string {
  assertTileIndexes(path);

  return path.map((tileIndex) => puzzle.grid.letters[tileIndex]).join("");
}

export function getClaimedStrandsTileIndexes(
  puzzle: StrandsPuzzle,
  state: StrandsGameState,
): number[] {
  const foundWords = new Set(state.foundWords);

  return getStrandsAnswers(puzzle)
    .filter(({ word }) => foundWords.has(word))
    .flatMap(({ path }) => path);
}

export function updateStrandsPath(
  puzzle: StrandsPuzzle,
  state: StrandsGameState,
  tileIndex: number,
): StrandsGameState {
  assertTileIndexes([tileIndex]);

  if (getStrandsGameStatus(puzzle, state) === "complete") {
    return state;
  }

  const claimedTileIndexes = new Set(
    getClaimedStrandsTileIndexes(puzzle, state),
  );

  if (claimedTileIndexes.has(tileIndex)) {
    return state;
  }

  const selectedPath = state.selectedPath;
  const finalTileIndex = selectedPath.at(-1);

  if (finalTileIndex === undefined) {
    return { ...state, selectedPath: [tileIndex] };
  }

  if (tileIndex === finalTileIndex) {
    return state;
  }

  if (
    selectedPath.length >= 2 &&
    tileIndex === selectedPath[selectedPath.length - 2]
  ) {
    return { ...state, selectedPath: selectedPath.slice(0, -1) };
  }

  if (
    selectedPath.includes(tileIndex) ||
    !areStrandsTilesAdjacent(finalTileIndex, tileIndex, puzzle.grid.columns)
  ) {
    return state;
  }

  return { ...state, selectedPath: [...selectedPath, tileIndex] };
}

export function clearStrandsPath(state: StrandsGameState): StrandsGameState {
  return state.selectedPath.length === 0
    ? state
    : { ...state, selectedPath: [] };
}

export function submitStrandsPath(
  puzzle: StrandsPuzzle,
  state: StrandsGameState,
): StrandsSubmissionResult {
  if (getStrandsGameStatus(puzzle, state) === "complete") {
    return { status: "game_complete", state };
  }

  const clearedState = clearStrandsPath(state);

  if (!isStructurallyValidPath(puzzle, state.selectedPath)) {
    return { status: "invalid_path", state: clearedState };
  }

  const matchedAnswer = findMatchingAnswer(puzzle, state.selectedPath);

  if (matchedAnswer && state.foundWords.includes(matchedAnswer.answer.word)) {
    return {
      status: "already_found",
      word: matchedAnswer.answer.word,
      state: clearedState,
    };
  }

  const claimedTileIndexes = new Set(
    getClaimedStrandsTileIndexes(puzzle, state),
  );

  if (
    state.selectedPath.some((tileIndex) => claimedTileIndexes.has(tileIndex))
  ) {
    return { status: "invalid_path", state: clearedState };
  }

  if (!matchedAnswer) {
    return { status: "not_theme", state: clearedState };
  }

  const nextState = {
    selectedPath: [],
    foundWords: [...state.foundWords, matchedAnswer.answer.word],
  };

  if (getStrandsGameStatus(puzzle, nextState) === "complete") {
    return {
      status: "game_complete",
      state: nextState,
      completedBy: {
        answerKind: matchedAnswer.kind,
        word: matchedAnswer.answer.word,
      },
    };
  }

  return {
    status:
      matchedAnswer.kind === "spangram" ? "found_spangram" : "found_theme",
    word: matchedAnswer.answer.word,
    state: nextState,
  };
}

function getStrandsAnswers(puzzle: StrandsPuzzle): StrandsAnswer[] {
  return [...puzzle.themeWords, puzzle.spangram];
}

function isStructurallyValidPath(
  puzzle: StrandsPuzzle,
  path: StrandsPath,
): boolean {
  if (
    path.length < STRANDS_MIN_WORD_LENGTH ||
    path.some(
      (tileIndex) =>
        !Number.isInteger(tileIndex) ||
        tileIndex < 0 ||
        tileIndex >= STRANDS_TILE_COUNT,
    ) ||
    new Set(path).size !== path.length
  ) {
    return false;
  }

  return path
    .slice(1)
    .every((tileIndex, index) =>
      areStrandsTilesAdjacent(path[index]!, tileIndex, puzzle.grid.columns),
    );
}

function findMatchingAnswer(puzzle: StrandsPuzzle, path: StrandsPath) {
  for (const answer of puzzle.themeWords) {
    if (pathsMatch(answer.path, path)) {
      return { answer, kind: "theme" as const };
    }
  }

  return pathsMatch(puzzle.spangram.path, path)
    ? { answer: puzzle.spangram, kind: "spangram" as const }
    : null;
}

function pathsMatch(storedPath: StrandsPath, selectedPath: StrandsPath) {
  if (storedPath.length !== selectedPath.length) {
    return false;
  }

  const forward = storedPath.every(
    (tileIndex, index) => tileIndex === selectedPath[index],
  );
  const reverse = storedPath.every(
    (tileIndex, index) =>
      tileIndex === selectedPath[selectedPath.length - 1 - index],
  );

  return forward || reverse;
}

function assertTileIndexes(path: StrandsPath) {
  if (
    path.some(
      (tileIndex) =>
        !Number.isInteger(tileIndex) ||
        tileIndex < 0 ||
        tileIndex >= STRANDS_TILE_COUNT,
    )
  ) {
    throw new Error(
      `Strands tile indexes must be integers from 0 to ${STRANDS_TILE_COUNT - 1}.`,
    );
  }
}
