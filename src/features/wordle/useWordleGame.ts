import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addWordleLetter,
  createInitialWordleGameState,
  getWordleGameStatus,
  removeWordleLetter,
  submitWordleGuess,
} from "@/domain/wordle/gameplay";
import type {
  WordleGameState,
  WordleLetterStatus,
  WordlePuzzle,
  WordleSubmittedGuess,
} from "@/domain/wordle/types";

export type WordleKeyboardStatuses = Partial<
  Record<string, WordleLetterStatus>
>;

export type WordleFeedback = "incomplete" | null;

type WordleControllerState = {
  gameState: WordleGameState;
  feedback: WordleFeedback;
  incompleteAttempt: number;
};

const KEY_STATUS_PRIORITY: Record<WordleLetterStatus, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function useWordleGame(puzzle: WordlePuzzle) {
  const [controllerState, setControllerState] = useState<WordleControllerState>(
    () => ({
      gameState: createInitialWordleGameState(),
      feedback: null,
      incompleteAttempt: 0,
    }),
  );

  const addLetter = useCallback((letter: string) => {
    setControllerState((currentState) => {
      const nextGameState = addWordleLetter(currentState.gameState, letter);

      if (nextGameState === currentState.gameState && !currentState.feedback) {
        return currentState;
      }

      return {
        gameState: nextGameState,
        feedback: null,
        incompleteAttempt: currentState.incompleteAttempt,
      };
    });
  }, []);

  const backspace = useCallback(() => {
    setControllerState((currentState) => {
      const nextGameState = removeWordleLetter(currentState.gameState);

      if (nextGameState === currentState.gameState && !currentState.feedback) {
        return currentState;
      }

      return {
        gameState: nextGameState,
        feedback: null,
        incompleteAttempt: currentState.incompleteAttempt,
      };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setControllerState((currentState) => {
      const result = submitWordleGuess(puzzle.answer, currentState.gameState);

      switch (result.status) {
        case "submitted":
          return {
            gameState: result.state,
            feedback: null,
            incompleteAttempt: currentState.incompleteAttempt,
          };
        case "incomplete":
          return {
            gameState: currentState.gameState,
            feedback: "incomplete",
            incompleteAttempt: currentState.incompleteAttempt + 1,
          };
        case "game_over":
          return currentState;
      }
    });
  }, [puzzle.answer]);

  const restart = useCallback(() => {
    setControllerState({
      gameState: createInitialWordleGameState(),
      feedback: null,
      incompleteAttempt: 0,
    });
  }, []);

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
    () => deriveKeyboardStatuses(controllerState.gameState.submittedGuesses),
    [controllerState.gameState.submittedGuesses],
  );

  return {
    currentGuess: controllerState.gameState.currentGuess,
    submittedGuesses: controllerState.gameState.submittedGuesses,
    gameStatus: getWordleGameStatus(controllerState.gameState),
    keyboardStatuses,
    feedback: controllerState.feedback,
    incompleteAttempt: controllerState.incompleteAttempt,
    addLetter,
    backspace,
    submitGuess,
    restart,
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
