import "server-only";

import type { StrandsPuzzle } from "@/domain/strands/types";

export const bigDayStrandsPuzzle: StrandsPuzzle = {
  id: "the-big-day",
  themeClue: "The Big Day",
  grid: {
    rows: 8,
    columns: 6,
    letters: "CEWRECERETPEMONDIOBYIDGNOUNUESQUGVSTETDSEIVOWAYL",
  },
  themeWords: [
    {
      word: "CEREMONY",
      path: [0, 1, 7, 6, 12, 13, 14, 19],
    },
    {
      word: "RECEPTION",
      path: [3, 4, 5, 11, 10, 9, 16, 17, 23],
    },
    {
      word: "BOUQUET",
      path: [18, 24, 25, 30, 31, 36, 37],
    },
    {
      word: "GUESTS",
      path: [22, 27, 28, 29, 35, 34],
    },
    {
      word: "VOWS",
      path: [42, 43, 44, 39],
    },
    {
      word: "VEIL",
      path: [33, 40, 41, 47],
    },
  ],
  spangram: {
    word: "WEDDINGDAY",
    path: [2, 8, 15, 21, 20, 26, 32, 38, 45, 46],
  },
};

export const strandsPuzzles: StrandsPuzzle[] = [bigDayStrandsPuzzle];
