export const WORDLE_WORD_LENGTH = 5;

export type WordlePuzzle = {
  id: string;
  answer: string;
};

export type WordleLetterStatus = "correct" | "present" | "absent";

export type WordleLetterEvaluation = {
  letter: string;
  status: WordleLetterStatus;
};

export type WordleSubmittedGuess = {
  guess: string;
  evaluation: WordleLetterEvaluation[];
};

export type WordleGameState = {
  currentGuess: string;
  submittedGuesses: WordleSubmittedGuess[];
};

export type WordleGameStatus = "playing" | "won" | "lost";

export type WordleGuessSubmissionResult =
  | {
      status: "submitted";
      state: WordleGameState;
    }
  | {
      status: "incomplete";
      state: WordleGameState;
    }
  | {
      status: "game_over";
      state: WordleGameState;
    };
