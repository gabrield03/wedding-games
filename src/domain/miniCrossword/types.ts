export const MINI_CROSSWORD_BLOCK = "#";

export type MiniCrosswordDirection = "across" | "down";

export type MiniCrosswordCell = {
  row: number;
  column: number;
};

export type MiniCrosswordEntry = {
  number: number;
  direction: MiniCrosswordDirection;
  clue: string;
  answer: string;
  cells: MiniCrosswordCell[];
};

export type MiniCrosswordPuzzle = {
  id: string;
  title: string;
  grid: {
    rows: number;
    columns: number;
    solution: string[];
  };
  entries: MiniCrosswordEntry[];
};

export type MiniCrosswordGameStatus = "playing" | "complete";

export type MiniCrosswordGameState = {
  letters: Array<string | null>;
  status: MiniCrosswordGameStatus;
};

export type MiniCrosswordSubmissionResult = {
  status: "incomplete" | "incorrect" | "correct";
  state: MiniCrosswordGameState;
};
