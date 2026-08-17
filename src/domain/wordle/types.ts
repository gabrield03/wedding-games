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
