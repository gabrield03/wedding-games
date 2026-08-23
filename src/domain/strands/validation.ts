import { areStrandsTilesAdjacent } from "@/domain/strands/gameplay";
import {
  STRANDS_GRID_COLUMNS,
  STRANDS_GRID_ROWS,
  STRANDS_MIN_WORD_LENGTH,
  STRANDS_TILE_COUNT,
  type StrandsAnswer,
  type StrandsPuzzle,
} from "@/domain/strands/types";

const UPPERCASE_ASCII_PATTERN = /^[A-Z]+$/;
const MULTIPLE_PATH_LIMIT = 2;

export function validateStrandsPuzzle(puzzle: StrandsPuzzle): string[] {
  const errors: string[] = [];

  if (!puzzle.id.trim()) {
    errors.push("Puzzle ID must not be empty");
  }

  if (!puzzle.themeClue.trim()) {
    errors.push("Puzzle theme clue must not be empty");
  }

  if (puzzle.grid.rows !== STRANDS_GRID_ROWS) {
    errors.push(`Puzzle grid must contain exactly ${STRANDS_GRID_ROWS} rows`);
  }

  if (puzzle.grid.columns !== STRANDS_GRID_COLUMNS) {
    errors.push(
      `Puzzle grid must contain exactly ${STRANDS_GRID_COLUMNS} columns`,
    );
  }

  if (puzzle.grid.letters.length !== STRANDS_TILE_COUNT) {
    errors.push(
      `Puzzle grid must contain exactly ${STRANDS_TILE_COUNT} letters`,
    );
  }

  if (!UPPERCASE_ASCII_PATTERN.test(puzzle.grid.letters)) {
    errors.push("Puzzle grid must contain only uppercase ASCII letters");
  }

  if (puzzle.themeWords.length === 0) {
    errors.push("Puzzle must contain at least one theme word");
  }

  const usedWords = new Set<string>();
  const usedTiles = new Map<number, string>();
  const answers = [
    ...puzzle.themeWords.map((answer) => ({
      answer,
      label: "Theme word" as const,
    })),
    { answer: puzzle.spangram, label: "Spangram" as const },
  ];

  for (const { answer, label } of answers) {
    validateAnswer(puzzle, answer, label, usedWords, usedTiles, errors);
  }

  const uncoveredTiles = Array.from(
    { length: STRANDS_TILE_COUNT },
    (_, tileIndex) => tileIndex,
  ).filter((tileIndex) => !usedTiles.has(tileIndex));

  if (uncoveredTiles.length > 0) {
    errors.push(
      `Puzzle has uncovered tile indexes: ${uncoveredTiles.join(", ")}`,
    );
  }

  if (!touchesOppositeEdges(puzzle.spangram.path)) {
    errors.push("Spangram path must touch two opposite grid edges");
  }

  if (hasValidGridShape(puzzle)) {
    for (const { answer, label } of answers) {
      validateUniqueAnswerPath(puzzle, answer, label, errors);
    }
  }

  return errors;
}

function validateAnswer(
  puzzle: StrandsPuzzle,
  answer: StrandsAnswer,
  label: "Theme word" | "Spangram",
  usedWords: Set<string>,
  usedTiles: Map<number, string>,
  errors: string[],
) {
  const answerLabel = `${label} ${answer.word || "(blank)"}`;

  if (
    answer.word.length < STRANDS_MIN_WORD_LENGTH ||
    !UPPERCASE_ASCII_PATTERN.test(answer.word)
  ) {
    errors.push(
      `${answerLabel} must contain at least ${STRANDS_MIN_WORD_LENGTH} uppercase ASCII letters`,
    );
  }

  if (usedWords.has(answer.word)) {
    errors.push(`Duplicate answer word: ${answer.word}`);
  } else {
    usedWords.add(answer.word);
  }

  if (answer.path.length !== answer.word.length) {
    errors.push(`${answerLabel} path length must match its word length`);
  }

  const validIndexes = answer.path.filter(
    (tileIndex) =>
      Number.isInteger(tileIndex) &&
      tileIndex >= 0 &&
      tileIndex < STRANDS_TILE_COUNT,
  );

  if (validIndexes.length !== answer.path.length) {
    errors.push(
      `${answerLabel} path indexes must be integers from 0 to ${STRANDS_TILE_COUNT - 1}`,
    );
  }

  if (new Set(answer.path).size !== answer.path.length) {
    errors.push(`${answerLabel} path must not reuse a tile`);
  }

  if (
    validIndexes.length === answer.path.length &&
    answer.path
      .slice(1)
      .some(
        (tileIndex, index) =>
          !areStrandsTilesAdjacent(
            answer.path[index]!,
            tileIndex,
            puzzle.grid.columns,
          ),
      )
  ) {
    errors.push(`${answerLabel} path must use adjacent tiles`);
  }

  if (validIndexes.length === answer.path.length) {
    const pathWord = answer.path
      .map((tileIndex) => puzzle.grid.letters[tileIndex] ?? "")
      .join("");

    if (pathWord !== answer.word) {
      errors.push(`${answerLabel} path letters must spell ${answer.word}`);
    }
  }

  for (const tileIndex of validIndexes) {
    const existingAnswer = usedTiles.get(tileIndex);

    if (existingAnswer) {
      errors.push(
        `Tile index ${tileIndex} is shared by ${existingAnswer} and ${answer.word}`,
      );
    } else {
      usedTiles.set(tileIndex, answer.word);
    }
  }
}

function validateUniqueAnswerPath(
  puzzle: StrandsPuzzle,
  answer: StrandsAnswer,
  label: "Theme word" | "Spangram",
  errors: string[],
) {
  if (
    answer.word.length < STRANDS_MIN_WORD_LENGTH ||
    !UPPERCASE_ASCII_PATTERN.test(answer.word)
  ) {
    return;
  }

  const pathCount = countSpellingPaths(
    puzzle.grid.letters,
    puzzle.grid.columns,
    answer.word,
    MULTIPLE_PATH_LIMIT,
  );
  const answerLabel = `${label} ${answer.word}`;

  if (pathCount === 0) {
    errors.push(`${answerLabel} has no valid path that spells ${answer.word}`);
  } else if (pathCount > 1) {
    errors.push(
      `${answerLabel} has multiple valid paths that spell ${answer.word}`,
    );
  }
}

function countSpellingPaths(
  letters: string,
  columns: number,
  word: string,
  limit: number,
): number {
  let pathCount = 0;
  const visited = new Set<number>();

  function search(tileIndex: number, wordIndex: number) {
    if (pathCount >= limit) {
      return;
    }

    if (wordIndex === word.length - 1) {
      pathCount += 1;
      return;
    }

    visited.add(tileIndex);
    const nextLetter = word[wordIndex + 1];

    for (
      let candidateIndex = 0;
      candidateIndex < letters.length;
      candidateIndex += 1
    ) {
      if (
        visited.has(candidateIndex) ||
        letters[candidateIndex] !== nextLetter ||
        !areStrandsTilesAdjacent(tileIndex, candidateIndex, columns)
      ) {
        continue;
      }

      search(candidateIndex, wordIndex + 1);

      if (pathCount >= limit) {
        break;
      }
    }

    visited.delete(tileIndex);
  }

  for (let tileIndex = 0; tileIndex < letters.length; tileIndex += 1) {
    if (letters[tileIndex] !== word[0]) {
      continue;
    }

    search(tileIndex, 0);

    if (pathCount >= limit) {
      break;
    }
  }

  return pathCount;
}

function hasValidGridShape(puzzle: StrandsPuzzle): boolean {
  return (
    puzzle.grid.rows === STRANDS_GRID_ROWS &&
    puzzle.grid.columns === STRANDS_GRID_COLUMNS &&
    puzzle.grid.letters.length === STRANDS_TILE_COUNT &&
    UPPERCASE_ASCII_PATTERN.test(puzzle.grid.letters)
  );
}

function touchesOppositeEdges(path: number[]): boolean {
  const touchesTop = path.some(
    (tileIndex) => Math.floor(tileIndex / STRANDS_GRID_COLUMNS) === 0,
  );
  const touchesBottom = path.some(
    (tileIndex) =>
      Math.floor(tileIndex / STRANDS_GRID_COLUMNS) === STRANDS_GRID_ROWS - 1,
  );
  const touchesLeft = path.some(
    (tileIndex) => tileIndex % STRANDS_GRID_COLUMNS === 0,
  );
  const touchesRight = path.some(
    (tileIndex) =>
      tileIndex % STRANDS_GRID_COLUMNS === STRANDS_GRID_COLUMNS - 1,
  );

  return (touchesTop && touchesBottom) || (touchesLeft && touchesRight);
}
