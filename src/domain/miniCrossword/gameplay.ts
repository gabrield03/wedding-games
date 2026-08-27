import {
  MINI_CROSSWORD_BLOCK,
  type MiniCrosswordCell,
  type MiniCrosswordGameState,
  type MiniCrosswordPuzzle,
  type MiniCrosswordSubmissionResult,
} from "@/domain/miniCrossword/types";

const ASCII_LETTER_PATTERN = /^[A-Za-z]$/;

export function createInitialMiniCrosswordGameState(
  puzzle: MiniCrosswordPuzzle,
): MiniCrosswordGameState {
  return {
    letters: Array.from(
      { length: puzzle.grid.rows * puzzle.grid.columns },
      () => null,
    ),
    status: "playing",
  };
}

export function setMiniCrosswordCellLetter(
  puzzle: MiniCrosswordPuzzle,
  state: MiniCrosswordGameState,
  cell: MiniCrosswordCell,
  letter: string,
): MiniCrosswordGameState {
  if (!ASCII_LETTER_PATTERN.test(letter)) {
    throw new Error("Letter must be a single ASCII alphabetic character");
  }

  const cellIndex = getCellIndex(puzzle, cell);

  if (
    state.status === "complete" ||
    getSolutionCharacter(puzzle, cell) === MINI_CROSSWORD_BLOCK
  ) {
    return state;
  }

  const normalizedLetter = letter.toUpperCase();

  if (state.letters[cellIndex] === normalizedLetter) {
    return state;
  }

  const letters = [...state.letters];
  letters[cellIndex] = normalizedLetter;

  return {
    ...state,
    letters,
  };
}

export function clearMiniCrosswordCell(
  puzzle: MiniCrosswordPuzzle,
  state: MiniCrosswordGameState,
  cell: MiniCrosswordCell,
): MiniCrosswordGameState {
  const cellIndex = getCellIndex(puzzle, cell);

  if (
    state.status === "complete" ||
    getSolutionCharacter(puzzle, cell) === MINI_CROSSWORD_BLOCK ||
    state.letters[cellIndex] === null
  ) {
    return state;
  }

  const letters = [...state.letters];
  letters[cellIndex] = null;

  return {
    ...state,
    letters,
  };
}

export function isMiniCrosswordBoardFilled(
  puzzle: MiniCrosswordPuzzle,
  state: MiniCrosswordGameState,
): boolean {
  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      const cell = { row, column };

      if (
        getSolutionCharacter(puzzle, cell) !== MINI_CROSSWORD_BLOCK &&
        state.letters[getCellIndex(puzzle, cell)] === null
      ) {
        return false;
      }
    }
  }

  return true;
}

export function submitMiniCrossword(
  puzzle: MiniCrosswordPuzzle,
  state: MiniCrosswordGameState,
): MiniCrosswordSubmissionResult {
  if (state.status === "complete") {
    return { status: "correct", state };
  }

  if (!isMiniCrosswordBoardFilled(puzzle, state)) {
    return { status: "incomplete", state };
  }

  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      const cell = { row, column };
      const solutionCharacter = getSolutionCharacter(puzzle, cell);

      if (solutionCharacter === MINI_CROSSWORD_BLOCK) {
        continue;
      }

      if (state.letters[getCellIndex(puzzle, cell)] !== solutionCharacter) {
        return { status: "incorrect", state };
      }
    }
  }

  return {
    status: "correct",
    state: {
      ...state,
      status: "complete",
    },
  };
}

export function resetMiniCrosswordGame(
  puzzle: MiniCrosswordPuzzle,
): MiniCrosswordGameState {
  return createInitialMiniCrosswordGameState(puzzle);
}

function getCellIndex(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
): number {
  assertValidCell(puzzle, cell);
  return cell.row * puzzle.grid.columns + cell.column;
}

function getSolutionCharacter(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
): string {
  assertValidCell(puzzle, cell);
  return puzzle.grid.solution[cell.row]![cell.column]!;
}

function assertValidCell(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
): void {
  if (
    !Number.isInteger(cell.row) ||
    !Number.isInteger(cell.column) ||
    cell.row < 0 ||
    cell.column < 0 ||
    cell.row >= puzzle.grid.rows ||
    cell.column >= puzzle.grid.columns
  ) {
    throw new Error("Cell must be within the Mini Crossword grid");
  }
}
