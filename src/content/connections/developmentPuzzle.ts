import type { ConnectionsPuzzle } from "@/domain/connections/types";

export const developmentPuzzle: ConnectionsPuzzle = {
  id: "development-puzzle",
  title: "Development Puzzle",
  groups: [
    {
      id: "group-cake",
      category: "Types of cake",
      tiles: [
        { id: "letter-a", label: "pound" },
        { id: "letter-b", label: "cheese" },
        { id: "letter-c", label: "coffee" },
        { id: "letter-d", label: "crab" },
      ],
    },
    {
      id: "group-cats",
      category: "Types of cats",
      tiles: [
        { id: "number-1", label: "tuxedo" },
        { id: "number-2", label: "calico" },
        { id: "number-3", label: "tabi" },
        { id: "number-4", label: "siamese" },
      ],
    },
    {
      id: "group-things-that-ring",
      category: "Things that ring",
      tiles: [
        { id: "symbol-exclamation", label: "saturn" },
        { id: "symbol-at", label: "boxing" },
        { id: "symbol-hash", label: "doorbell" },
        { id: "symbol-dollar", label: "telephone" },
      ],
    },
    {
      id: "group-contains-bow",
      category: "Contains bow",
      tiles: [
        { id: "animal-cat", label: "rainbow" },
        { id: "animal-cow", label: "crossbow" },
        { id: "animal-dog", label: "elbow" },
        { id: "animal-moose", label: "bowtie" },
      ],
    },
  ],
};
