"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  clearStrandsPath,
  createInitialStrandsGameState,
  getClaimedStrandsTileIndexes,
  getStrandsAnswerMatch,
  getStrandsGameStatus,
  getStrandsPathWord,
  submitStrandsPath,
  updateStrandsPath,
  type StrandsSubmissionResult,
} from "@/domain/strands/gameplay";
import type { StrandsGameState, StrandsPuzzle } from "@/domain/strands/types";

type StrandsFeedback =
  | { kind: "found-theme"; message: string }
  | { kind: "found-spangram"; message: string }
  | { kind: "already-found"; message: string }
  | { kind: "not-theme"; message: string }
  | { kind: "invalid-path"; message: string }
  | { kind: "complete"; message: string }
  | null;

export function useStrandsGame(puzzle: StrandsPuzzle) {
  const initialState = createInitialStrandsGameState();
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const [feedback, setFeedback] = useState<StrandsFeedback>(null);

  const commitState = useCallback((nextState: StrandsGameState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const setSubmissionFeedback = useCallback(
    (result: StrandsSubmissionResult) => {
      switch (result.status) {
        case "found_theme":
          setFeedback({
            kind: "found-theme",
            message: `Found: ${result.word}`,
          });
          break;
        case "found_spangram":
          setFeedback({
            kind: "found-spangram",
            message: `Spangram found: ${result.word}`,
          });
          break;
        case "already_found":
          setFeedback({
            kind: "already-found",
            message: `${result.word} is already found.`,
          });
          break;
        case "not_theme":
          setFeedback({ kind: "not-theme", message: "Not a theme word." });
          break;
        case "invalid_path":
          setFeedback({
            kind: "invalid-path",
            message: "Select at least four adjacent letters.",
          });
          break;
        case "game_complete":
          setFeedback({ kind: "complete", message: "Puzzle complete!" });
          break;
      }
    },
    [],
  );

  const gameStatus = useMemo(
    () => getStrandsGameStatus(puzzle, state),
    [puzzle, state],
  );
  const selectedWord = useMemo(
    () => getStrandsPathWord(puzzle, state.selectedPath),
    [puzzle, state.selectedPath],
  );
  const claimedTileIndexes = useMemo(
    () => getClaimedStrandsTileIndexes(puzzle, state),
    [puzzle, state],
  );

  const selectTile = useCallback(
    (tileIndex: number): boolean => {
      setFeedback(null);

      const nextState = updateStrandsPath(
        puzzle,
        stateRef.current,
        tileIndex,
      );
      const matchedAnswer = getStrandsAnswerMatch(
        puzzle,
        nextState.selectedPath,
      );

      if (!matchedAnswer) {
        commitState(nextState);
        return false;
      }

      const result = submitStrandsPath(puzzle, nextState);
      commitState(result.state);
      setSubmissionFeedback(result);
      return true;
    },
    [commitState, puzzle, setSubmissionFeedback],
  );

  const clearSelection = useCallback(() => {
    setFeedback(null);
    commitState(clearStrandsPath(stateRef.current));
  }, [commitState]);

  const submitSelection = useCallback(() => {
    const result = submitStrandsPath(puzzle, stateRef.current);

    commitState(result.state);
    setSubmissionFeedback(result);
  }, [commitState, puzzle, setSubmissionFeedback]);

  const playAgain = useCallback(() => {
    commitState(createInitialStrandsGameState());
    setFeedback(null);
  }, [commitState]);

  return {
    selectedPath: state.selectedPath,
    selectedWord,
    foundWords: state.foundWords,
    claimedTileIndexes,
    gameStatus,
    feedback,
    canInteract: gameStatus === "playing",
    answerCount: puzzle.themeWords.length + 1,
    selectTile,
    clearSelection,
    submitSelection,
    playAgain,
  };
}
