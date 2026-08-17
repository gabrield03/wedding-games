import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addWordleLetter,
  createInitialWordleGameState,
  getWordleGameStatus,
  removeWordleLetter,
  submitWordleGuess,
} from "@/domain/wordle/gameplay";
import type {
  WordleLetterStatus,
  WordlePuzzle,
  WordleSubmittedGuess,
} from "@/domain/wordle/types";

export type WordleKeyboardStatuses = Partial<
  Record<string, WordleLetterStatus>
>;

const KEY_STATUS_PRIORITY: Record<WordleLetterStatus, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function useWordleGame(puzzle: WordlePuzzle) {
  const [gameState, setGameState] = useState(createInitialWordleGameState);

  const addLetter = useCallback((letter: string) => {
    setGameState((currentState) => addWordleLetter(currentState, letter));
  }, []);

  const backspace = useCallback(() => {
    setGameState((currentState) => removeWordleLetter(currentState));
  }, []);

  const submitGuess = useCallback(() => {
    setGameState((currentState) => {
      const result = submitWordleGuess(puzzle.answer, currentState);

      return result.status === "submitted" ? result.state : currentState;
    });
  }, [puzzle.answer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isInteractiveOrEditableTarget(event.target)
      ) {
        return;
      }

      if (/^[A-Za-z]$/.test(event.key)) {
        event.preventDefault();
        addLetter(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addLetter, backspace, submitGuess]);

  const keyboardStatuses = useMemo(
    () => deriveKeyboardStatuses(gameState.submittedGuesses),
    [gameState.submittedGuesses],
  );

  return {
    currentGuess: gameState.currentGuess,
    submittedGuesses: gameState.submittedGuesses,
    gameStatus: getWordleGameStatus(gameState),
    keyboardStatuses,
    addLetter,
    backspace,
    submitGuess,
  };
}

function deriveKeyboardStatuses(
  submittedGuesses: WordleSubmittedGuess[],
): WordleKeyboardStatuses {
  const statuses: WordleKeyboardStatuses = {};

  for (const { evaluation } of submittedGuesses) {
    for (const { letter, status } of evaluation) {
      const currentStatus = statuses[letter];

      if (
        currentStatus === undefined ||
        KEY_STATUS_PRIORITY[status] > KEY_STATUS_PRIORITY[currentStatus]
      ) {
        statuses[letter] = status;
      }
    }
  }

  return statuses;
}

function isInteractiveOrEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest("button, a, input, textarea, select, [contenteditable]") !==
      null
  );
}
