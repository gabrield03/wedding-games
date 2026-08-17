import { describe, expect, it } from "vitest";

import {
  applyGuessResult,
  createInitialGameState,
  evaluateGuess,
  getGameStatus,
  getMistakesRemaining,
  getRemainingTiles,
  type ConnectionsGameState,
} from "@/domain/connections/gameplay";
import { testConnectionsPuzzle } from "../../../fixtures/connections";

function group(index: number) {
  return testConnectionsPuzzle.groups[index]!;
}

function tileId(groupIndex: number, tileIndex: number) {
  return group(groupIndex).tiles[tileIndex]!.id;
}

describe("Connections gameplay", () => {
  describe("createInitialGameState", () => {
    it("creates an empty playthrough", () => {
      expect(createInitialGameState()).toEqual({
        solvedGroupIds: [],
        incorrectGuesses: [],
      });
    });
  });

  describe("evaluateGuess", () => {
    it("identifies a correct group regardless of tile order", () => {
      const state = createInitialGameState();
      const firstGroup = group(0);

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 3),
        tileId(0, 1),
        tileId(0, 0),
        tileId(0, 2),
      ]);

      expect(result).toEqual({
        status: "correct",
        groupId: firstGroup.id,
      });
    });

    it("identifies an incorrect guess that is one away", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(0, 2),
        tileId(1, 0),
      ]);

      expect(result).toEqual({
        status: "incorrect",
        oneAway: true,
        tileIds: [tileId(0, 0), tileId(0, 1), tileId(0, 2), tileId(1, 0)],
      });
    });

    it("identifies an incorrect guess that is not one away", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(1, 0),
        tileId(1, 1),
      ]);

      expect(result).toEqual({
        status: "incorrect",
        oneAway: false,
        tileIds: [tileId(0, 0), tileId(0, 1), tileId(1, 0), tileId(1, 1)],
      });
    });

    it("rejects a previously submitted incorrect guess regardless of order", () => {
      const initialState = createInitialGameState();

      const firstResult = evaluateGuess(testConnectionsPuzzle, initialState, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(1, 0),
        tileId(1, 1),
      ]);

      const nextState = applyGuessResult(initialState, firstResult);

      const duplicateResult = evaluateGuess(testConnectionsPuzzle, nextState, [
        tileId(1, 1),
        tileId(0, 1),
        tileId(1, 0),
        tileId(0, 0),
      ]);

      expect(duplicateResult).toEqual({
        status: "duplicate",
      });
    });

    it("rejects a guess that does not contain exactly four tiles", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(0, 2),
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "wrong_tile_count",
      });
    });

    it("rejects a guess containing the same tile more than once", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 0),
        tileId(0, 1),
        tileId(0, 2),
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "duplicate_tile",
      });
    });

    it("rejects a guess containing a tile that does not exist", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(0, 2),
        "does-not-exist",
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "unknown_tile",
      });
    });

    it("rejects guesses containing tiles from an already solved group", () => {
      const firstGroup = group(0);

      const state: ConnectionsGameState = {
        solvedGroupIds: [firstGroup.id],
        incorrectGuesses: [],
      };

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(1, 0),
        tileId(1, 1),
        tileId(1, 2),
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "solved_tile",
      });
    });

    it("rejects guesses after the game has ended", () => {
      const state: ConnectionsGameState = {
        solvedGroupIds: [],
        incorrectGuesses: [["guess-1"], ["guess-2"], ["guess-3"], ["guess-4"]],
      };

      const result = evaluateGuess(
        testConnectionsPuzzle,
        state,
        group(0).tiles.map((tile) => tile.id),
      );

      expect(result).toEqual({
        status: "invalid",
        reason: "game_over",
      });
    });
  });

  describe("applyGuessResult", () => {
    it("adds a solved group after a correct guess", () => {
      const state = createInitialGameState();
      const firstGroup = group(0);

      const result = evaluateGuess(
        testConnectionsPuzzle,
        state,
        firstGroup.tiles.map((tile) => tile.id),
      );

      const nextState = applyGuessResult(state, result);

      expect(nextState.solvedGroupIds).toEqual([firstGroup.id]);
      expect(state.solvedGroupIds).toEqual([]);
    });

    it("records a new incorrect guess", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(testConnectionsPuzzle, state, [
        tileId(0, 0),
        tileId(0, 1),
        tileId(1, 0),
        tileId(1, 1),
      ]);

      const nextState = applyGuessResult(state, result);

      expect(nextState.incorrectGuesses).toHaveLength(1);
      expect(state.incorrectGuesses).toEqual([]);
    });
  });

  describe("derived game state", () => {
    it("calculates mistakes remaining", () => {
      const state: ConnectionsGameState = {
        solvedGroupIds: [],
        incorrectGuesses: [["guess-1"], ["guess-2"]],
      };

      expect(getMistakesRemaining(state)).toBe(2);
    });

    it("derives playing, won, and lost states", () => {
      expect(
        getGameStatus(testConnectionsPuzzle, createInitialGameState()),
      ).toBe("playing");

      expect(
        getGameStatus(testConnectionsPuzzle, {
          solvedGroupIds: testConnectionsPuzzle.groups.map((group) => group.id),
          incorrectGuesses: [],
        }),
      ).toBe("won");

      expect(
        getGameStatus(testConnectionsPuzzle, {
          solvedGroupIds: [],
          incorrectGuesses: [
            ["guess-1"],
            ["guess-2"],
            ["guess-3"],
            ["guess-4"],
          ],
        }),
      ).toBe("lost");
    });

    it("returns only tiles from unsolved groups", () => {
      const initialState = createInitialGameState();
      const firstGroup = group(0);

      expect(
        getRemainingTiles(testConnectionsPuzzle, initialState),
      ).toHaveLength(16);

      const state: ConnectionsGameState = {
        solvedGroupIds: [firstGroup.id],
        incorrectGuesses: [],
      };

      const remainingTiles = getRemainingTiles(testConnectionsPuzzle, state);
      const solvedTileIds = new Set(firstGroup.tiles.map((tile) => tile.id));

      expect(remainingTiles).toHaveLength(12);
      expect(remainingTiles.some((tile) => solvedTileIds.has(tile.id))).toBe(
        false,
      );
    });
  });
});
