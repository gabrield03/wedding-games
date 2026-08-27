import type { MiniCrosswordPuzzle } from "@/domain/miniCrossword/types";

export const testMiniCrosswordPuzzle: MiniCrosswordPuzzle = {
  id: "test-mini",
  title: "Test Mini",
  grid: {
    rows: 5,
    columns: 5,
    solution: ["##ABC", "#DEFG", "HIJKL", "MNOP#", "QRS##"],
  },
  entries: [
    {
      number: 1,
      direction: "across",
      clue: "Test across 1",
      answer: "ABC",
      cells: [
        { row: 0, column: 2 },
        { row: 0, column: 3 },
        { row: 0, column: 4 },
      ],
    },
    {
      number: 4,
      direction: "across",
      clue: "Test across 4",
      answer: "DEFG",
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
      clue: "Test across 5",
      answer: "HIJKL",
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
      clue: "Test across 6",
      answer: "MNOP",
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
      clue: "Test across 7",
      answer: "QRS",
      cells: [
        { row: 4, column: 0 },
        { row: 4, column: 1 },
        { row: 4, column: 2 },
      ],
    },
    {
      number: 1,
      direction: "down",
      clue: "Test down 1",
      answer: "AEJOS",
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
      clue: "Test down 2",
      answer: "BFKP",
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
      clue: "Test down 3",
      answer: "CGL",
      cells: [
        { row: 0, column: 4 },
        { row: 1, column: 4 },
        { row: 2, column: 4 },
      ],
    },
    {
      number: 4,
      direction: "down",
      clue: "Test down 4",
      answer: "DINR",
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
      clue: "Test down 5",
      answer: "HMQ",
      cells: [
        { row: 2, column: 0 },
        { row: 3, column: 0 },
        { row: 4, column: 0 },
      ],
    },
  ],
};
