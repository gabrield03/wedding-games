import type { ConnectionsPuzzle } from "./types";

export const developmentPuzzle: ConnectionsPuzzle = {
  id: "development-puzzle",
  title: "Development Puzzle",
  groups: [
    {
      id: "group-letters",
      category: "Letters",
      tiles: [
        { id: "letter-a", label: "A" },
        { id: "letter-b", label: "B" },
        { id: "letter-c", label: "C" },
        { id: "letter-d", label: "D" },
      ],
    },
    {
      id: "group-numbers",
      category: "Numbers",
      tiles: [
        { id: "number-1", label: "1" },
        { id: "number-2", label: "2" },
        { id: "number-3", label: "3" },
        { id: "number-4", label: "4" },
      ],
    },
    {
      id: "group-special-characters",
      category: "Special Characters",
      tiles: [
        { id: "symbol-exclamation", label: "!" },
        { id: "symbol-at", label: "@" },
        { id: "symbol-hash", label: "#" },
        { id: "symbol-dollar", label: "$" },
      ],
    },
    {
      id: "group-animals",
      category: "Animals",
      tiles: [
        { id: "animal-cat", label: "Cat" },
        { id: "animal-cow", label: "Cow" },
        { id: "animal-dog", label: "Dog" },
        { id: "animal-moose", label: "Moose" },
      ],
    },
  ],
};
