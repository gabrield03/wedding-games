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
    const group = puzzle.groups[0]!;

    group.tiles.pop();

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain(`Group ${group.id} must contain exactly 4 tiles`);
  });

  it("rejects duplicate group and tile IDs", () => {
    const puzzle = createValidPuzzle();
    const firstGroup = puzzle.groups[0]!;
    const secondGroup = puzzle.groups[1]!;
    const firstTile = firstGroup.tiles[0]!;

    secondGroup.id = firstGroup.id;
    secondGroup.tiles[0]!.id = firstTile.id;

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain(`Duplicate group ID: ${firstGroup.id}`);
    expect(errors).toContain(`Duplicate tile ID: ${firstTile.id}`);
  });

  it("rejects duplicate categories and tile labels", () => {
    const puzzle = createValidPuzzle();
    const firstGroup = puzzle.groups[0]!;
    const secondGroup = puzzle.groups[1]!;
    const firstTile = firstGroup.tiles[0]!;

    secondGroup.category = firstGroup.category;
    secondGroup.tiles[0]!.label = firstTile.label;

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain(
      `Duplicate group category: ${firstGroup.category}`,
    );
    expect(errors).toContain(`Duplicate tile label: ${firstTile.label}`);
  });

  it("rejects blank required text", () => {
    const puzzle = createValidPuzzle();
    const tile = puzzle.groups[0]!.tiles[0]!;

    puzzle.title = "   ";
    tile.label = "   ";

    const errors = validateConnectionsPuzzle(puzzle);

    expect(errors).toContain("Puzzle title must not be empty");
    expect(errors).toContain(`Tile ${tile.id} must have a label`);
  });
});
