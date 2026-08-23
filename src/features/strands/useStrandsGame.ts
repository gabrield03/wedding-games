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
  | { kind: "hint"; message: string }
  | { kind: "complete"; message: string }
  | null;

export function useStrandsGame(puzzle: StrandsPuzzle) {
  const initialState = createInitialStrandsGameState();
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const [feedback, setFeedback] = useState<StrandsFeedback>(null);
  const [hintedWord, setHintedWord] = useState<string | null>(null);

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

  const clearResolvedHint = useCallback((result: StrandsSubmissionResult) => {
    const resolvedWord =
      result.status === "found_theme" ||
      result.status === "found_spangram" ||
      result.status === "already_found"
        ? result.word
        : result.status === "game_complete"
          ? result.completedBy?.word
          : undefined;

    if (!resolvedWord) {
      return;
    }

    setHintedWord((currentHint) =>
      currentHint === resolvedWord ? null : currentHint,
    );
  }, []);

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
  const hintedPath = useMemo(
    () => puzzle.themeWords.find(({ word }) => word === hintedWord)?.path ?? [],
    [hintedWord, puzzle.themeWords],
  );
  const canHint = useMemo(
    () =>
      gameStatus === "playing" &&
      puzzle.themeWords.some(({ word }) => !state.foundWords.includes(word)),
    [gameStatus, puzzle.themeWords, state.foundWords],
  );

  const selectTile = useCallback(
    (tileIndex: number): boolean => {
      setFeedback(null);

      const nextState = updateStrandsPath(puzzle, stateRef.current, tileIndex);
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
      clearResolvedHint(result);
      setSubmissionFeedback(result);
      return true;
    },
    [clearResolvedHint, commitState, puzzle, setSubmissionFeedback],
  );

  const clearSelection = useCallback(() => {
    setFeedback(null);
    commitState(clearStrandsPath(stateRef.current));
  }, [commitState]);

  const submitSelection = useCallback(() => {
    const result = submitStrandsPath(puzzle, stateRef.current);

    commitState(result.state);
    clearResolvedHint(result);
    setSubmissionFeedback(result);
  }, [clearResolvedHint, commitState, puzzle, setSubmissionFeedback]);

  const showHint = useCallback(() => {
    if (getStrandsGameStatus(puzzle, stateRef.current) === "complete") {
      return;
    }

    if (
      hintedWord &&
      !stateRef.current.foundWords.includes(hintedWord) &&
      puzzle.themeWords.some(({ word }) => word === hintedWord)
    ) {
      setFeedback({ kind: "hint", message: "Hint highlighted on the board." });
      return;
    }

    const remainingThemeWords = puzzle.themeWords.filter(
      ({ word }) => !stateRef.current.foundWords.includes(word),
    );

    if (remainingThemeWords.length === 0) {
      return;
    }

    const hintedAnswer =
      remainingThemeWords[
        Math.floor(Math.random() * remainingThemeWords.length)
      ]!;

    setHintedWord(hintedAnswer.word);
    setFeedback({ kind: "hint", message: "Hint highlighted on the board." });
  }, [hintedWord, puzzle]);

  const playAgain = useCallback(() => {
    commitState(createInitialStrandsGameState());
    setHintedWord(null);
    setFeedback(null);
  }, [commitState]);

  return {
    selectedPath: state.selectedPath,
    selectedWord,
    foundWords: state.foundWords,
    claimedTileIndexes,
    hintedPath,
    gameStatus,
    feedback,
    canInteract: gameStatus === "playing",
    canHint,
    answerCount: puzzle.themeWords.length + 1,
    selectTile,
    clearSelection,
    submitSelection,
    showHint,
    playAgain,
  };
}
