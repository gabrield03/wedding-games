import { describe, expect, it } from "vitest";

import { developmentPuzzle } from "@/domain/connections/fixtures";
import {
  applyGuessResult,
  createInitialGameState,
  evaluateGuess,
  getGameStatus,
  getMistakesRemaining,
  getRemainingTiles,
  type ConnectionsGameState,
} from "@/domain/connections/gameplay";

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

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-d",
        "letter-b",
        "letter-a",
        "letter-c",
      ]);

      expect(result).toEqual({
        status: "correct",
        groupId: "group-letters",
      });
    });

    it("identifies an incorrect guess that is one away", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "letter-c",
        "number-1",
      ]);

      expect(result).toEqual({
        status: "incorrect",
        oneAway: true,
        tileIds: ["letter-a", "letter-b", "letter-c", "number-1"],
      });
    });

    it("identifies an incorrect guess that is not one away", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "number-1",
        "number-2",
      ]);

      expect(result).toEqual({
        status: "incorrect",
        oneAway: false,
        tileIds: ["letter-a", "letter-b", "number-1", "number-2"],
      });
    });

    it("rejects a previously submitted incorrect guess regardless of order", () => {
      const initialState = createInitialGameState();

      const firstResult = evaluateGuess(developmentPuzzle, initialState, [
        "letter-a",
        "letter-b",
        "number-1",
        "number-2",
      ]);

      const nextState = applyGuessResult(initialState, firstResult);

      const duplicateResult = evaluateGuess(developmentPuzzle, nextState, [
        "number-2",
        "letter-b",
        "number-1",
        "letter-a",
      ]);

      expect(duplicateResult).toEqual({
        status: "duplicate",
      });
    });

    it("rejects a guess that does not contain exactly four tiles", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "letter-c",
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "wrong_tile_count",
      });
    });

    it("rejects a guess containing the same tile more than once", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-a",
        "letter-b",
        "letter-c",
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "duplicate_tile",
      });
    });

    it("rejects a guess containing a tile that does not exist", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "letter-c",
        "does-not-exist",
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "unknown_tile",
      });
    });

    it("rejects guesses containing tiles from an already solved group", () => {
      const state: ConnectionsGameState = {
        solvedGroupIds: ["group-letters"],
        incorrectGuesses: [],
      };

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "number-1",
        "number-2",
        "number-3",
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

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "letter-c",
        "letter-d",
      ]);

      expect(result).toEqual({
        status: "invalid",
        reason: "game_over",
      });
    });
  });

  describe("applyGuessResult", () => {
    it("adds a solved group after a correct guess", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "letter-c",
        "letter-d",
      ]);

      const nextState = applyGuessResult(state, result);

      expect(nextState.solvedGroupIds).toEqual(["group-letters"]);
      expect(state.solvedGroupIds).toEqual([]);
    });

    it("records a new incorrect guess", () => {
      const state = createInitialGameState();

      const result = evaluateGuess(developmentPuzzle, state, [
        "letter-a",
        "letter-b",
        "number-1",
        "number-2",
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
      expect(getGameStatus(developmentPuzzle, createInitialGameState())).toBe(
        "playing",
      );

      expect(
        getGameStatus(developmentPuzzle, {
          solvedGroupIds: developmentPuzzle.groups.map((group) => group.id),
          incorrectGuesses: [],
        }),
      ).toBe("won");

      expect(
        getGameStatus(developmentPuzzle, {
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

      expect(getRemainingTiles(developmentPuzzle, initialState)).toHaveLength(
        16,
      );

      const state: ConnectionsGameState = {
        solvedGroupIds: ["group-letters"],
        incorrectGuesses: [],
      };

      const remainingTiles = getRemainingTiles(developmentPuzzle, state);

      expect(remainingTiles).toHaveLength(12);
      expect(remainingTiles.some((tile) => tile.id.startsWith("letter-"))).toBe(
        false,
      );
    });
  });
});
