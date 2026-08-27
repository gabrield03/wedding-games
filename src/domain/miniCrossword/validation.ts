import {
  MINI_CROSSWORD_BLOCK,
  type MiniCrosswordCell,
  type MiniCrosswordDirection,
  type MiniCrosswordEntry,
  type MiniCrosswordPuzzle,
} from "@/domain/miniCrossword/types";

const GRID_CHARACTER_PATTERN = /^[A-Z#]+$/;
const ANSWER_PATTERN = /^[A-Z]+$/;
const MIN_ANSWER_LENGTH = 2;

type ExpectedEntry = {
  number: number;
  direction: MiniCrosswordDirection;
  cells: MiniCrosswordCell[];
};

export function validateMiniCrosswordPuzzle(
  puzzle: MiniCrosswordPuzzle,
): string[] {
  const errors: string[] = [];

  if (!puzzle.id.trim()) {
    errors.push("Puzzle ID must not be empty");
  }

  if (!puzzle.title.trim()) {
    errors.push("Puzzle title must not be empty");
  }

  const hasValidGrid = validateGrid(puzzle, errors);

  if (puzzle.entries.length === 0) {
    errors.push("Puzzle must contain at least one entry");
  }

  const expectedEntries = hasValidGrid ? deriveExpectedEntries(puzzle) : [];
  const expectedByStartAndDirection = new Map(
    expectedEntries.map((entry) => [getEntryStartKey(entry), entry]),
  );
  const declaredStartAndDirections = new Set<string>();
  const declaredNumberDirections = new Set<string>();
  const numberStarts = new Map<number, string>();
  const coveredCells = new Set<string>();
  const crossingLetters = new Map<
    string,
    Array<{ label: string; letter: string }>
  >();

  for (const entry of puzzle.entries) {
    validateEntry(
      puzzle,
      entry,
      hasValidGrid,
      expectedByStartAndDirection,
      declaredStartAndDirections,
      declaredNumberDirections,
      numberStarts,
      coveredCells,
      crossingLetters,
      errors,
    );
  }

  if (hasValidGrid) {
    for (const expectedEntry of expectedEntries) {
      const key = getEntryStartKey(expectedEntry);

      if (!declaredStartAndDirections.has(key)) {
        const start = expectedEntry.cells[0]!;
        errors.push(
          `Missing ${expectedEntry.direction} entry starting at row ${start.row}, column ${start.column}`,
        );
      }
    }

    for (let row = 0; row < puzzle.grid.rows; row += 1) {
      for (let column = 0; column < puzzle.grid.columns; column += 1) {
        if (
          puzzle.grid.solution[row]![column] !== MINI_CROSSWORD_BLOCK &&
          !coveredCells.has(getCellKey({ row, column }))
        ) {
          errors.push(
            `Playable cell row ${row}, column ${column} is not covered by an entry`,
          );
        }
      }
    }

    for (const [cellKey, letters] of crossingLetters) {
      if (new Set(letters.map(({ letter }) => letter)).size <= 1) {
        continue;
      }

      const [row, column] = cellKey.split(":");
      errors.push(
        `Crossing at row ${row}, column ${column} has inconsistent letters`,
      );
    }
  }

  return errors;
}

function validateGrid(
  puzzle: MiniCrosswordPuzzle,
  errors: string[],
): boolean {
  let valid = true;

  if (!Number.isInteger(puzzle.grid.rows) || puzzle.grid.rows <= 0) {
    errors.push("Puzzle grid rows must be a positive integer");
    valid = false;
  }

  if (!Number.isInteger(puzzle.grid.columns) || puzzle.grid.columns <= 0) {
    errors.push("Puzzle grid columns must be a positive integer");
    valid = false;
  }

  if (puzzle.grid.solution.length !== puzzle.grid.rows) {
    errors.push("Puzzle grid solution row count must match grid rows");
    valid = false;
  }

  for (const [rowIndex, row] of puzzle.grid.solution.entries()) {
    if (row.length !== puzzle.grid.columns) {
      errors.push(
        `Puzzle grid row ${rowIndex} must contain exactly ${puzzle.grid.columns} cells`,
      );
      valid = false;
    }

    if (!GRID_CHARACTER_PATTERN.test(row)) {
      errors.push(
        `Puzzle grid row ${rowIndex} must contain only uppercase ASCII letters or # blocks`,
      );
      valid = false;
    }
  }

  return valid;
}

function validateEntry(
  puzzle: MiniCrosswordPuzzle,
  entry: MiniCrosswordEntry,
  hasValidGrid: boolean,
  expectedByStartAndDirection: Map<string, ExpectedEntry>,
  declaredStartAndDirections: Set<string>,
  declaredNumberDirections: Set<string>,
  numberStarts: Map<number, string>,
  coveredCells: Set<string>,
  crossingLetters: Map<string, Array<{ label: string; letter: string }>>,
  errors: string[],
) {
  const label = formatEntryLabel(entry);

  if (!Number.isInteger(entry.number) || entry.number <= 0) {
    errors.push(`${label} number must be a positive integer`);
  }

  if (entry.direction !== "across" && entry.direction !== "down") {
    errors.push(`${label} direction must be across or down`);
    return;
  }

  if (!entry.clue.trim()) {
    errors.push(`${label} clue must not be empty`);
  }

  if (
    entry.answer.length < MIN_ANSWER_LENGTH ||
    !ANSWER_PATTERN.test(entry.answer)
  ) {
    errors.push(
      `${label} answer must contain at least ${MIN_ANSWER_LENGTH} uppercase ASCII letters`,
    );
  }

  if (entry.cells.length !== entry.answer.length) {
    errors.push(`${label} cell count must match its answer length`);
  }

  const validCells = entry.cells.filter((cell) => isValidCell(puzzle, cell));

  if (validCells.length !== entry.cells.length) {
    errors.push(`${label} cells must stay within the puzzle grid`);
  }

  if (
    new Set(entry.cells.map((cell) => getCellKey(cell))).size !==
    entry.cells.length
  ) {
    errors.push(`${label} must not reuse a cell`);
  }

  const start = entry.cells[0];

  if (start) {
    const startKey = getCellKey(start);
    const startDirectionKey = getStartDirectionKey(start, entry.direction);
    const numberDirectionKey = `${entry.number}:${entry.direction}`;

    if (declaredStartAndDirections.has(startDirectionKey)) {
      errors.push(
        `Duplicate ${entry.direction} entry at row ${start.row}, column ${start.column}`,
      );
    } else {
      declaredStartAndDirections.add(startDirectionKey);
    }

    if (declaredNumberDirections.has(numberDirectionKey)) {
      errors.push(
        `Duplicate clue number ${entry.number} for ${entry.direction}`,
      );
    } else {
      declaredNumberDirections.add(numberDirectionKey);
    }

    if (Number.isInteger(entry.number) && entry.number > 0) {
      const existingStart = numberStarts.get(entry.number);

      if (existingStart && existingStart !== startKey) {
        errors.push(
          `Clue number ${entry.number} must refer to one start cell`,
        );
      } else {
        numberStarts.set(entry.number, startKey);
      }
    }

    if (hasValidGrid && isValidCell(puzzle, start)) {
      const expected = expectedByStartAndDirection.get(startDirectionKey);

      if (!expected) {
        errors.push(
          `${label} must start at a valid ${entry.direction} entry cell`,
        );
      } else {
        if (entry.number !== expected.number) {
          errors.push(
            `${label} number must be ${expected.number} for its start cell`,
          );
        }

        if (!cellsMatch(entry.cells, expected.cells)) {
          errors.push(
            `${label} cells must follow the complete ${entry.direction} answer path`,
          );
        }
      }
    }
  } else {
    errors.push(`${label} must contain at least one cell`);
  }

  if (!hasValidGrid) {
    return;
  }

  entry.cells.forEach((cell, index) => {
    if (!isValidCell(puzzle, cell)) {
      return;
    }

    const solutionCharacter = puzzle.grid.solution[cell.row]![cell.column]!;
    const cellKey = getCellKey(cell);

    if (solutionCharacter === MINI_CROSSWORD_BLOCK) {
      errors.push(
        `${label} must not pass through blocked cell row ${cell.row}, column ${cell.column}`,
      );
      return;
    }

    coveredCells.add(cellKey);

    const answerLetter = entry.answer[index];

    if (answerLetter && answerLetter !== solutionCharacter) {
      errors.push(
        `${label} answer must match the solution grid at row ${cell.row}, column ${cell.column}`,
      );
    }

    if (answerLetter) {
      const existing = crossingLetters.get(cellKey) ?? [];
      existing.push({ label, letter: answerLetter });
      crossingLetters.set(cellKey, existing);
    }
  });
}

function deriveExpectedEntries(puzzle: MiniCrosswordPuzzle): ExpectedEntry[] {
  const entries: ExpectedEntry[] = [];
  let nextNumber = 1;

  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      if (!isPlayableCell(puzzle, row, column)) {
        continue;
      }

      const acrossCells = getEntryCellsFromStart(
        puzzle,
        { row, column },
        "across",
      );
      const downCells = getEntryCellsFromStart(
        puzzle,
        { row, column },
        "down",
      );
      const startsAcross = acrossCells.length >= MIN_ANSWER_LENGTH;
      const startsDown = downCells.length >= MIN_ANSWER_LENGTH;

      if (!startsAcross && !startsDown) {
        continue;
      }

      const number = nextNumber;
      nextNumber += 1;

      if (startsAcross) {
        entries.push({ number, direction: "across", cells: acrossCells });
      }

      if (startsDown) {
        entries.push({ number, direction: "down", cells: downCells });
      }
    }
  }

  return entries;
}

function getEntryCellsFromStart(
  puzzle: MiniCrosswordPuzzle,
  start: MiniCrosswordCell,
  direction: MiniCrosswordDirection,
): MiniCrosswordCell[] {
  const previousRow = direction === "down" ? start.row - 1 : start.row;
  const previousColumn =
    direction === "across" ? start.column - 1 : start.column;

  if (
    isWithinGrid(puzzle, previousRow, previousColumn) &&
    isPlayableCell(puzzle, previousRow, previousColumn)
  ) {
    return [];
  }

  const cells: MiniCrosswordCell[] = [];
  const rowStep = direction === "down" ? 1 : 0;
  const columnStep = direction === "across" ? 1 : 0;
  let row = start.row;
  let column = start.column;

  while (
    isWithinGrid(puzzle, row, column) &&
    isPlayableCell(puzzle, row, column)
  ) {
    cells.push({ row, column });
    row += rowStep;
    column += columnStep;
  }

  return cells;
}

function isValidCell(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
): boolean {
  return (
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.column) &&
    isWithinGrid(puzzle, cell.row, cell.column)
  );
}

function isWithinGrid(
  puzzle: MiniCrosswordPuzzle,
  row: number,
  column: number,
): boolean {
  return (
    row >= 0 &&
    column >= 0 &&
    row < puzzle.grid.rows &&
    column < puzzle.grid.columns
  );
}

function isPlayableCell(
  puzzle: MiniCrosswordPuzzle,
  row: number,
  column: number,
): boolean {
  return puzzle.grid.solution[row]![column] !== MINI_CROSSWORD_BLOCK;
}

function cellsMatch(
  actual: MiniCrosswordCell[],
  expected: MiniCrosswordCell[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (cell, index) =>
        cell.row === expected[index]!.row &&
        cell.column === expected[index]!.column,
    )
  );
}

function getEntryStartKey(entry: ExpectedEntry): string {
  return getStartDirectionKey(entry.cells[0]!, entry.direction);
}

function getStartDirectionKey(
  cell: MiniCrosswordCell,
  direction: MiniCrosswordDirection,
): string {
  return `${getCellKey(cell)}:${direction}`;
}

function getCellKey(cell: MiniCrosswordCell): string {
  return `${cell.row}:${cell.column}`;
}

function formatEntryLabel(entry: MiniCrosswordEntry): string {
  return `Clue ${entry.number} ${entry.direction}`;
}
