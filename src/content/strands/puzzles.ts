import "server-only";

import type { StrandsPuzzle } from "@/domain/strands/types";

export const bigDayStrandsPuzzle: StrandsPuzzle = {
  id: "wedding-01",
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

export const travelsStrandsPuzzle: StrandsPuzzle = {
  id: "wedding-02",
  themeClue: "Our Travels",
  grid: {
    rows: 8,
    columns: 6,
    letters: "VAEVKYERNOUOCNCOTEREVEMSFORALOULTUCRORPNSNNALEAC",
  },
  themeWords: [
    {
      word: "KYOTO",
      path: [4, 5, 11, 16, 15],
    },
    {
      word: "ROME",
      path: [35, 29, 22, 17],
    },
    {
      word: "FLORENCE",
      path: [24, 31, 25, 18, 19, 13, 12, 6],
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
  id: "wedding-03",
  themeClue: "A go-to date night meal",
  grid: {
    rows: 8,
    columns: 6,
    letters: "IPHSSTMRBHHIMOASGFLLOIELHFRNDOOETHSOETOFNUBPOTUM",
  },
  themeWords: [
    {
      word: "MUSHROOM",
      path: [47, 41, 34, 33, 26, 20, 13, 12],
    },
    {
      word: "FISHBALL",
      path: [17, 11, 4, 9, 8, 14, 19, 18],
    },
    {
      word: "NOODLES",
      path: [40, 35, 29, 28, 23, 22, 15],
    },
    {
      word: "SHRIMP",
      path: [3, 2, 7, 0, 6, 1],
    },
    {
      word: "TOFU",
      path: [45, 44, 39, 46],
    },
    {
      word: "BEEF",
      path: [42, 36, 31, 25],
    },
  ],
  spangram: {
    word: "HOTPOTNIGHT",
    path: [24, 30, 37, 43, 38, 32, 27, 21, 16, 10, 5],
  },
};

export const sushiStrandsPuzzle: StrandsPuzzle = {
  id: "wedding-04",
  themeClue: "Special Occasions",
  grid: {
    rows: 8,
    columns: 6,
    letters: "LOMISSLPLIHAASAMONSCRINEWIGIASAMAKTOOSIOIRABROON",
  },
  themeWords: [
    {
      word: "NIGIRI",
      path: [22, 21, 26, 25, 20, 27],
    },
    {
      word: "SASHIMI",
      path: [4, 11, 5, 10, 3, 2, 9],
    },
    {
      word: "SCALLOP",
      path: [18, 19, 12, 6, 0, 1, 7],
    },
    {
      word: "SALMON",
      path: [13, 14, 8, 15, 16, 17],
    },
    {
      word: "OTORO",
      path: [35, 34, 39, 44, 45],
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
