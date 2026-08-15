import { describe, expect, it } from "vitest";

import { developmentPuzzle } from "@/domain/connections/fixtures";
import type { ConnectionsPuzzle } from "@/domain/connections/types";
import { validateConnectionsPuzzle } from "@/domain/connections/validation";

function createValidPuzzle(): ConnectionsPuzzle {
  return structuredClone(developmentPuzzle);
}

describe("validateConnectionsPuzzle", () => {
  it("returns no errors for a valid puzzle", () => {
    const puzzle = createValidPuzzle();

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toEqual([]);
  });

  it("rejects a puzzle with the wrong number of groups", () => {
    const puzzle = createValidPuzzle();
    puzzle.groups.pop();

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain("Puzzle must contain exactly 4 groups");
  });

  it("rejects a group with the wrong number of tiles", () => {
    const puzzle = createValidPuzzle();
    puzzle.groups[0].tiles.pop();

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain(
      "Group group-letters must contain exactly 4 tiles",
    );
  });

  it("rejects duplicate group and tile IDs", () => {
    const puzzle = createValidPuzzle();

    puzzle.groups[1].id = puzzle.groups[0].id;
    puzzle.groups[1].tiles[0].id = puzzle.groups[0].tiles[0].id;

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain("Duplicate group ID: group-letters");
    expect(errors).toContain("Duplicate tile ID: letter-a");
  });

  it("rejects duplicate categories and tile labels", () => {
    const puzzle = createValidPuzzle();

    puzzle.groups[1].category = puzzle.groups[0].category;
    puzzle.groups[1].tiles[0].label = puzzle.groups[0].tiles[0].label;

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain("Duplicate group category: Letters");
    expect(errors).toContain("Duplicate tile label: A");
  });

  it("rejects blank required text", () => {
    const puzzle = createValidPuzzle();

    puzzle.title = "   ";
    puzzle.groups[0].tiles[0].label = "   ";

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain("Puzzle title must not be empty");
    expect(errors).toContain("Tile letter-a must have a label");
  });
});
