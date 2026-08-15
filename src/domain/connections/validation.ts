import type { ConnectionsPuzzle } from "./types";

const REQUIRED_GROUP_COUNT = 4;
const REQUIRED_TILES_PER_GROUP = 4;

export function validateConnectionsPuzzle(puzzle: ConnectionsPuzzle): string[] {
  const errors: string[] = [];

  if (!puzzle.id.trim()) {
    errors.push("Puzzle ID must not be empty");
  }

  if (!puzzle.title.trim()) {
    errors.push("Puzzle title must not be empty");
  }

  if (puzzle.groups.length !== REQUIRED_GROUP_COUNT) {
    errors.push(`Puzzle must contain exactly ${REQUIRED_GROUP_COUNT} groups`);
  }

  const groupIds = new Set<string>();
  const categories = new Set<string>();
  const tileIds = new Set<string>();
  const tileLabels = new Set<string>();

  for (const group of puzzle.groups) {
    if (!group.id.trim()) {
      errors.push("Group ID must not be empty");
    } else if (groupIds.has(group.id)) {
      errors.push(`Duplicate group ID: ${group.id}`);
    } else {
      groupIds.add(group.id);
    }

    if (!group.category.trim()) {
      errors.push(`Group ${group.id} must have a category`);
    } else if (categories.has(group.category)) {
      errors.push(`Duplicate group category: ${group.category}`);
    } else {
      categories.add(group.category);
    }

    if (group.tiles.length !== REQUIRED_TILES_PER_GROUP) {
      errors.push(
        `Group ${group.id} must contain exactly ${REQUIRED_TILES_PER_GROUP} tiles`,
      );
    }

    for (const tile of group.tiles) {
      if (!tile.id.trim()) {
        errors.push(`Group ${group.id} contains a tile with an empty ID`);
      } else if (tileIds.has(tile.id)) {
        errors.push(`Duplicate tile ID: ${tile.id}`);
      } else {
        tileIds.add(tile.id);
      }

      if (!tile.label.trim()) {
        errors.push(`Tile ${tile.id} must have a label`);
      } else if (tileLabels.has(tile.label)) {
        errors.push(`Duplicate tile label: ${tile.label}`);
      } else {
        tileLabels.add(tile.label);
      }
    }
  }

  return errors;
}
