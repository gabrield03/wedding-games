import "server-only";

import type { StrandsPuzzle } from "@/domain/strands/types";

import { STRANDS_PUZZLE_IDS } from "./puzzleIds";

export const bigDayStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[0],
  themeClue: "The Big Day",
  grid: {
    rows: 8,
    columns: 6,
    letters: "CEWRECERETPEMONDIOBYDIGNOUNEUSQUGVSTETDAEIVOWSYL",
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
      path: [22, 28, 27, 34, 35, 29],
    },
    {
      word: "VOWS",
      path: [42, 43, 44, 45],
    },
    {
      word: "VEIL",
      path: [33, 40, 41, 47],
    },
  ],
  spangram: {
    word: "WEDDINGDAY",
    path: [2, 8, 15, 20, 21, 26, 32, 38, 39, 46],
  },
};

export const travelsStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[1],
  themeClue: "Places we've been",
  grid: {
    rows: 8,
    columns: 6,
    letters: "URRAVEOTVESLOACOMRTNUVAOKOECCNEYRUESNCFNPLEROLNA",
  },
  themeWords: [
    {
      word: "KYOTO",
      path: [24, 31, 25, 18, 12],
    },
    {
      word: "ROME",
      path: [17, 23, 16, 9],
    },
    {
      word: "FLORENCE",
      path: [38, 45, 44, 43, 42, 36, 37, 30],
    },
    {
      word: "NAPLES",
      path: [46, 47, 40, 41, 34, 35],
    },
    {
      word: "VANCOUVER",
      path: [8, 13, 19, 14, 15, 20, 21, 26, 32],
    },
    {
      word: "CANCUN",
      path: [27, 22, 29, 28, 33, 39],
    },
  ],
  spangram: {
    word: "OURTRAVELS",
    path: [6, 0, 1, 7, 2, 3, 4, 5, 11, 10],
  },
};

export const hotPotStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[2],
  themeClue: "A go-to date night meal",
  grid: {
    rows: 8,
    columns: 6,
    letters: "OTPIGHHONSUTSTHRFMDEOMSIOLOSBHONRHFAUFPIELOTMEBL",
  },
  themeWords: [
    {
      word: "MUSHROOM",
      path: [17, 10, 9, 14, 15, 20, 26, 21],
    },
    {
      word: "FISHBALL",
      path: [16, 23, 22, 29, 28, 35, 41, 47],
    },
    {
      word: "NOODLES",
      path: [31, 30, 24, 18, 25, 19, 12],
    },
    {
      word: "SHRIMP",
      path: [27, 33, 32, 39, 44, 38],
    },
    {
      word: "TOFU",
      path: [43, 42, 37, 36],
    },
    {
      word: "BEEF",
      path: [46, 45, 40, 34],
    },
  ],
  spangram: {
    word: "HOTPOTNIGHT",
    path: [6, 0, 1, 2, 7, 13, 8, 3, 4, 5, 11],
  },
};

export const sushiStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[3],
  themeClue: "An expensive dinner",
  grid: {
    rows: 8,
    columns: 6,
    letters: "LOSASHLPOIMIANMLASSCRINEWIIGASSAIKROABAOIROMTOON",
  },
  themeWords: [
    {
      word: "NIGIRI",
      path: [22, 21, 27, 26, 20, 25],
    },
    {
      word: "SASHIMI",
      path: [2, 3, 4, 5, 11, 10, 9],
    },
    {
      word: "SCALLOP",
      path: [18, 19, 12, 6, 0, 1, 7],
    },
    {
      word: "SALMON",
      path: [17, 16, 15, 14, 8, 13],
    },
    {
      word: "OTORO",
      path: [45, 44, 39, 34, 35],
    },
    {
      word: "WASABI",
      path: [24, 31, 30, 36, 37, 32],
    },
    {
      word: "NORI",
      path: [47, 46, 41, 40],
    },
  ],
  spangram: {
    word: "OMAKASE",
    path: [42, 43, 38, 33, 28, 29, 23],
  },
};

export const newOrleansStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[4],
  themeClue: "Where it all started",
  grid: {
    rows: 8,
    columns: 6,
    letters: "NEWORLRASJAEGOUOZAIYSYZNDARSVSRBETOBAOODOEMTENGI",
  },
  themeWords: [
    {
      word: "JAZZ",
      path: [9, 10, 16, 22],
    },
    {
      word: "BEIGNET",
      path: [35, 41, 47, 46, 45, 44, 43],
    },
    {
      word: "OYSTERS",
      path: [15, 21, 27, 33, 32, 26, 20],
    },
    {
      word: "VOODOO",
      path: [28, 34, 40, 39, 38, 37],
    },
    {
      word: "MARDIGRAS",
      path: [42, 36, 30, 24, 18, 12, 6, 7, 8],
    },
    {
      word: "BAYOU",
      path: [31, 25, 19, 13, 14],
    },
  ],
  spangram: {
    word: "NEWORLEANS",
    path: [0, 1, 2, 3, 4, 5, 11, 17, 23, 29],
  },
};

export const strandsPuzzles: StrandsPuzzle[] = [
  bigDayStrandsPuzzle,
  travelsStrandsPuzzle,
  hotPotStrandsPuzzle,
  sushiStrandsPuzzle,
  newOrleansStrandsPuzzle,
];
