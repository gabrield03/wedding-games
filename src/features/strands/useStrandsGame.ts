"use client";

import { useCallback, useMemo, useState } from "react";

import {
  clearStrandsPath,
  createInitialStrandsGameState,
  getClaimedStrandsTileIndexes,
  getStrandsGameStatus,
  getStrandsPathWord,
  submitStrandsPath,
  updateStrandsPath,
} from "@/domain/strands/gameplay";
import {
  STRANDS_MIN_WORD_LENGTH,
  type StrandsPuzzle,
} from "@/domain/strands/types";

type StrandsFeedback =
  | { kind: "found-theme"; message: string }
  | { kind: "found-spangram"; message: string }
  | { kind: "already-found"; message: string }
  | { kind: "not-theme"; message: string }
  | { kind: "invalid-path"; message: string }
  | { kind: "complete"; message: string }
  | null;

export function useStrandsGame(puzzle: StrandsPuzzle) {
  const [state, setState] = useState(createInitialStrandsGameState);
  const [feedback, setFeedback] = useState<StrandsFeedback>(null);

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
    (tileIndex: number) => {
      setFeedback(null);
      setState((currentState) =>
        updateStrandsPath(puzzle, currentState, tileIndex),
      );
    },
    [puzzle],
  );

  const clearSelection = useCallback(() => {
    setFeedback(null);
    setState((currentState) => clearStrandsPath(currentState));
  }, []);

  const submitSelection = useCallback(() => {
    const result = submitStrandsPath(puzzle, state);

    setState(result.state);

    switch (result.status) {
      case "found_theme":
        setFeedback({ kind: "found-theme", message: `Found: ${result.word}` });
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
  }, [puzzle, state]);

  const playAgain = useCallback(() => {
    setState(createInitialStrandsGameState());
    setFeedback(null);
  }, []);

  return {
    selectedPath: state.selectedPath,
    selectedWord,
    foundWords: state.foundWords,
    claimedTileIndexes,
    gameStatus,
    feedback,
    canInteract: gameStatus === "playing",
    canSubmit:
      gameStatus === "playing" &&
      state.selectedPath.length >= STRANDS_MIN_WORD_LENGTH,
    answerCount: puzzle.themeWords.length + 1,
    selectTile,
    clearSelection,
    submitSelection,
    playAgain,
  };
}
