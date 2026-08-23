export const STRANDS_GRID_ROWS = 8;
export const STRANDS_GRID_COLUMNS = 6;
export const STRANDS_TILE_COUNT = STRANDS_GRID_ROWS * STRANDS_GRID_COLUMNS;
export const STRANDS_MIN_WORD_LENGTH = 4;

export type StrandsPath = number[];

export type StrandsAnswer = {
  word: string;
  path: StrandsPath;
};

export type StrandsPuzzle = {
  id: string;
  themeClue: string;
  grid: {
    rows: number;
    columns: number;
    letters: string;
  };
  themeWords: StrandsAnswer[];
  spangram: StrandsAnswer;
};

export type StrandsGameState = {
  selectedPath: StrandsPath;
  foundWords: string[];
};

export type StrandsGameStatus = "playing" | "complete";
