import type { ConnectionsPuzzle } from "./types";

// export const developmentPuzzle: ConnectionsPuzzle = {
//   id: "development-puzzle",
//   title: "Development Puzzle",
//   groups: [
//     {
//       id: "group-letters",
//       category: "Letters",
//       tiles: [
//         { id: "letter-a", label: "A" },
//         { id: "letter-b", label: "B" },
//         { id: "letter-c", label: "C" },
//         { id: "letter-d", label: "D" },
//       ],
//     },
//     {
//       id: "group-numbers",
//       category: "Numbers",
//       tiles: [
//         { id: "number-1", label: "1" },
//         { id: "number-2", label: "2" },
//         { id: "number-3", label: "3" },
//         { id: "number-4", label: "4" },
//       ],
//     },
//     {
//       id: "group-special-characters",
//       category: "Special Characters",
//       tiles: [
//         { id: "symbol-exclamation", label: "!" },
//         { id: "symbol-at", label: "@" },
//         { id: "symbol-hash", label: "#" },
//         { id: "symbol-dollar", label: "$" },
//       ],
//     },
//     {
//       id: "group-animals",
//       category: "Animals",
//       tiles: [
//         { id: "animal-cat", label: "Cat" },
//         { id: "animal-cow", label: "Cow" },
//         { id: "animal-dog", label: "Dog" },
//         { id: "animal-moose", label: "Moose" },
//       ],
//     },
//   ],
// };

// potential list - not just us
// wedding related
// appetizers - entree options, beef, vegetarian, fish, etc.
// wedding traditions - something blue
// flower colors - blue
// ** types of kisses
// ** types of cakes
// ** things with a ring - saturn, boxing, doorbell, telephone
// _ toast - avocado, cinammon, wedding
// _ date - date, blind,

// pop ups of us clapping if they get it right

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
