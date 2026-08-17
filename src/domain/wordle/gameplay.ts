import {
  WORDLE_WORD_LENGTH,
  type WordleLetterEvaluation,
} from "@/domain/wordle/types";

const WORDLE_WORD_PATTERN = new RegExp(`^[A-Za-z]{${WORDLE_WORD_LENGTH}}$`);

export function evaluateWordleGuess(
  answer: string,
  guess: string,
): WordleLetterEvaluation[] {
  assertValidWord(answer, "Answer");
  assertValidWord(guess, "Guess");

  const normalizedAnswer = answer.toUpperCase();
  const normalizedGuess = guess.toUpperCase();
  const evaluations: WordleLetterEvaluation[] = [...normalizedGuess].map(
    (letter) => ({
      letter,
      status: "absent",
    }),
  );
  const unmatchedAnswerLetterCounts = new Map<string, number>();

  for (let index = 0; index < WORDLE_WORD_LENGTH; index += 1) {
    const answerLetter = normalizedAnswer[index]!;
    const guessLetter = normalizedGuess[index]!;

    if (guessLetter === answerLetter) {
      evaluations[index]!.status = "correct";
      continue;
    }

    unmatchedAnswerLetterCounts.set(
      answerLetter,
      (unmatchedAnswerLetterCounts.get(answerLetter) ?? 0) + 1,
    );
  }

  for (let index = 0; index < WORDLE_WORD_LENGTH; index += 1) {
    const evaluation = evaluations[index]!;

    if (evaluation.status === "correct") {
      continue;
    }

    const remainingCount =
      unmatchedAnswerLetterCounts.get(evaluation.letter) ?? 0;

    if (remainingCount > 0) {
      evaluation.status = "present";
      unmatchedAnswerLetterCounts.set(evaluation.letter, remainingCount - 1);
    }
  }

  return evaluations;
}

function assertValidWord(word: string, label: "Answer" | "Guess"): void {
  if (!WORDLE_WORD_PATTERN.test(word)) {
    throw new Error(
      `${label} must contain exactly ${WORDLE_WORD_LENGTH} ASCII letters`,
    );
  }
}
