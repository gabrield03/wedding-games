import { WORDLE_WORD_LENGTH, type WordlePuzzle } from "@/domain/wordle/types";

const ASCII_ALPHABETIC_PATTERN = /^[A-Za-z]+$/;

export function validateWordlePuzzle(puzzle: WordlePuzzle): string[] {
  const errors: string[] = [];

  if (!puzzle.id.trim()) {
    errors.push("Puzzle ID must not be empty");
  }

  if (puzzle.answer.length !== WORDLE_WORD_LENGTH) {
    errors.push(
      `Puzzle answer must contain exactly ${WORDLE_WORD_LENGTH} letters`,
    );
  }

  if (!ASCII_ALPHABETIC_PATTERN.test(puzzle.answer)) {
    errors.push("Puzzle answer must contain only ASCII alphabetic characters");
  }

  return errors;
}
