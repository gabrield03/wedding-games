import {
  WORDLE_WORD_LENGTH,
  type WordleGameState,
  type WordleGameStatus,
  type WordleGuessSubmissionResult,
  type WordleLetterEvaluation,
} from "@/domain/wordle/types";

export const WORDLE_MAX_ATTEMPTS = 6;

const WORDLE_WORD_PATTERN = new RegExp(`^[A-Za-z]{${WORDLE_WORD_LENGTH}}$`);
const WORDLE_LETTER_PATTERN = /^[A-Za-z]$/;

export function createInitialWordleGameState(): WordleGameState {
  return {
    currentGuess: "",
    submittedGuesses: [],
  };
}

export function getWordleGameStatus(state: WordleGameState): WordleGameStatus {
  const hasWinningGuess = state.submittedGuesses.some(
    ({ evaluation }) =>
      evaluation.length === WORDLE_WORD_LENGTH &&
      evaluation.every(({ status }) => status === "correct"),
  );

  if (hasWinningGuess) {
    return "won";
  }

  if (state.submittedGuesses.length >= WORDLE_MAX_ATTEMPTS) {
    return "lost";
  }

  return "playing";
}

export function addWordleLetter(
  state: WordleGameState,
  letter: string,
): WordleGameState {
  if (!WORDLE_LETTER_PATTERN.test(letter)) {
    throw new Error("Letter must be a single ASCII alphabetic character");
  }

  if (
    getWordleGameStatus(state) !== "playing" ||
    state.currentGuess.length >= WORDLE_WORD_LENGTH
  ) {
    return state;
  }

  return {
    ...state,
    currentGuess: `${state.currentGuess}${letter.toUpperCase()}`,
  };
}

export function removeWordleLetter(state: WordleGameState): WordleGameState {
  if (
    getWordleGameStatus(state) !== "playing" ||
    state.currentGuess.length === 0
  ) {
    return state;
  }

  return {
    ...state,
    currentGuess: state.currentGuess.slice(0, -1),
  };
}

export function submitWordleGuess(
  answer: string,
  state: WordleGameState,
): WordleGuessSubmissionResult {
  if (getWordleGameStatus(state) !== "playing") {
    return {
      status: "game_over",
      state,
    };
  }

  if (state.currentGuess.length !== WORDLE_WORD_LENGTH) {
    return {
      status: "incomplete",
      state,
    };
  }

  const normalizedGuess = state.currentGuess.toUpperCase();
  const evaluation = evaluateWordleGuess(answer, normalizedGuess);

  return {
    status: "submitted",
    state: {
      currentGuess: "",
      submittedGuesses: [
        ...state.submittedGuesses,
        {
          guess: normalizedGuess,
          evaluation,
        },
      ],
    },
  };
}

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
