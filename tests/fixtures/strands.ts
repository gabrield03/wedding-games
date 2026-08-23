import type { StrandsPuzzle } from "@/domain/strands/types";

export const testStrandsPuzzle: StrandsPuzzle = {
  id: "test-strands-puzzle",
  themeClue: "Test paths",
  grid: {
    rows: 8,
    columns: 6,
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPVUTSRQ",
  },
  themeWords: [
    { word: "ABCDEF", path: [0, 1, 2, 3, 4, 5] },
    { word: "GHIJKL", path: [6, 7, 8, 9, 10, 11] },
    { word: "MNOPQR", path: [12, 13, 14, 15, 16, 17] },
    { word: "STUVWX", path: [18, 19, 20, 21, 22, 23] },
    { word: "YZABCD", path: [24, 25, 26, 27, 28, 29] },
    { word: "EFGHIJ", path: [30, 31, 32, 33, 34, 35] },
  ],
  spangram: {
    word: "KLMNOPQRSTUV",
    path: [36, 37, 38, 39, 40, 41, 47, 46, 45, 44, 43, 42],
  },
};
