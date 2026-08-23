import "server-only";

import type { StrandsPuzzle } from "@/domain/strands/types";

import { STRANDS_PUZZLE_IDS } from "./puzzleIds";

export const bigDayStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[0],
  themeClue: "The Big Day",
  grid: {
    rows: 8,
    columns: 6,
    letters: "CEWRECERETPEMONDIOBYIDGNOUNEUSQUGVSTETDSEIVOWAYL",
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

export const travelsStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[1],
  themeClue: "Our Travels",
  grid: {
    rows: 8,
    columns: 6,
    letters: "VAEVOTERNOUONCCKYROEVEOSRLRALMUFTUCEORPNSNNALEAC",
  },
  themeWords: [
    {
      word: "KYOTO",
      path: [15, 16, 11, 5, 4],
    },
    {
      word: "ROME",
      path: [17, 22, 29, 35],
    },
    {
      word: "FLORENCE",
      path: [31, 25, 18, 24, 19, 12, 13, 6],
    },
    {
      word: "NAPLES",
      path: [42, 43, 38, 44, 45, 40],
    },
    {
      word: "VANCOUVER",
      path: [0, 1, 8, 14, 9, 10, 3, 2, 7],
    },
    {
      word: "CANCUN",
      path: [47, 46, 41, 34, 33, 39],
    },
  ],
  spangram: {
    word: "OURTRAVELS",
    path: [36, 30, 37, 32, 26, 27, 20, 21, 28, 23],
  },
};

export const hotPotStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[2],
  themeClue: "A go-to date night meal",
  grid: {
    rows: 8,
    columns: 6,
    letters: "SHMPAHRIHBOLMOSSTLFIOPELTBRODOHETHSOEGNFNUFIOTUM",
  },
  themeWords: [
    {
      word: "MUSHROOM",
      path: [47, 41, 34, 33, 26, 20, 13, 12],
    },
    {
      word: "FISHBALL",
      path: [18, 19, 14, 8, 9, 4, 11, 17],
    },
    {
      word: "NOODLES",
      path: [40, 35, 29, 28, 23, 22, 15],
    },
    {
      word: "SHRIMP",
      path: [0, 1, 6, 7, 2, 3],
    },
    {
      word: "TOFU",
      path: [45, 44, 39, 46],
    },
    {
      word: "BEEF",
      path: [25, 31, 36, 42],
    },
  ],
  spangram: {
    word: "HOTPOTNIGHT",
    path: [5, 10, 16, 21, 27, 32, 38, 43, 37, 30, 24],
  },
};

export const sushiStrandsPuzzle: StrandsPuzzle = {
  id: STRANDS_PUZZLE_IDS[3],
  themeClue: "Special Occasions",
  grid: {
    rows: 8,
    columns: 6,
    letters: "LOSASHLPOIMIANMLASSCRINEWIIGASAMAKROOSIOIRABTOON",
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
      path: [24, 30, 37, 42, 43, 38],
    },
    {
      word: "NORI",
      path: [47, 46, 41, 40],
    },
  ],
  spangram: {
    word: "OMAKASE",
    path: [36, 31, 32, 33, 28, 29, 23],
  },
};

export const strandsPuzzles: StrandsPuzzle[] = [
  bigDayStrandsPuzzle,
  travelsStrandsPuzzle,
  hotPotStrandsPuzzle,
  sushiStrandsPuzzle,
];
