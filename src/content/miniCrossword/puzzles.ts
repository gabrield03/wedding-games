import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";

export const miniCrosswordPuzzles: MiniCrosswordPuzzle[] = [
  {
    id: "wedding-01",
    title: "Wedding Mini #1",
    grid: {
      rows: 5,
      columns: 5,
      solution: ["##GET", "#DEAR", "MARRY", "ARMS#", "YES##"],
    },
    entries: [
      {
        number: 1,
        direction: "across",
        clue: "Understand, as a joke",
        answer: "GET",
        cells: [
          { row: 0, column: 2 },
          { row: 0, column: 3 },
          { row: 0, column: 4 },
        ],
      },
      {
        number: 4,
        direction: "across",
        clue: "Term of affection",
        answer: "DEAR",
        cells: [
          { row: 1, column: 1 },
          { row: 1, column: 2 },
          { row: 1, column: 3 },
          { row: 1, column: 4 },
        ],
      },
      {
        number: 5,
        direction: "across",
        clue: "Tie the knot",
        answer: "MARRY",
        cells: [
          { row: 2, column: 0 },
          { row: 2, column: 1 },
          { row: 2, column: 2 },
          { row: 2, column: 3 },
          { row: 2, column: 4 },
        ],
      },
      {
        number: 6,
        direction: "across",
        clue: "Things wrapped around someone in a hug",
        answer: "ARMS",
        cells: [
          { row: 3, column: 0 },
          { row: 3, column: 1 },
          { row: 3, column: 2 },
          { row: 3, column: 3 },
        ],
      },
      {
        number: 7,
        direction: "across",
        clue: "Answer hoped for after “Will you marry me?”",
        answer: "YES",
        cells: [
          { row: 4, column: 0 },
          { row: 4, column: 1 },
          { row: 4, column: 2 },
        ],
      },
      {
        number: 1,
        direction: "down",
        clue: "Things partners may share after one gets a cold",
        answer: "GERMS",
        cells: [
          { row: 0, column: 2 },
          { row: 1, column: 2 },
          { row: 2, column: 2 },
          { row: 3, column: 2 },
          { row: 4, column: 2 },
        ],
      },
      {
        number: 2,
        direction: "down",
        clue: "What “I love you” might be whispered into",
        answer: "EARS",
        cells: [
          { row: 0, column: 3 },
          { row: 1, column: 3 },
          { row: 2, column: 3 },
          { row: 3, column: 3 },
        ],
      },
      {
        number: 3,
        direction: "down",
        clue: "Give a relationship another shot",
        answer: "TRY",
        cells: [
          { row: 0, column: 4 },
          { row: 1, column: 4 },
          { row: 2, column: 4 },
        ],
      },
      {
        number: 4,
        direction: "down",
        clue: "Challenge for a playful date night",
        answer: "DARE",
        cells: [
          { row: 1, column: 1 },
          { row: 2, column: 1 },
          { row: 3, column: 1 },
          { row: 4, column: 1 },
        ],
      },
      {
        number: 5,
        direction: "down",
        clue: "Popular month for spring weddings",
        answer: "MAY",
        cells: [
          { row: 2, column: 0 },
          { row: 3, column: 0 },
          { row: 4, column: 0 },
        ],
      },
    ],
  },
];
