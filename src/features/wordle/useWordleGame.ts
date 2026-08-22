import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAnonymousPlayerBootstrap } from "@/app/games/AnonymousPlayerBootstrap";
import type {
  WordleAttemptSnapshot,
  WordleGameplayErrorCode,
  WordlePuzzlePreview,
} from "@/contracts/wordle";
import type {
  WordleLetterStatus,
  WordleSubmittedGuess,
} from "@/domain/wordle/types";
import { WORDLE_WORD_LENGTH } from "@/domain/wordle/types";

import { requestWordleAttempt, requestWordleGuess } from "./wordleApiClient";

const WORDLE_REVEAL_DURATION_MS = 600;

export type WordleKeyboardStatuses = Partial<
  Record<string, WordleLetterStatus>
>;

export type WordleFeedback =
  "incomplete" | "invalid-word" | "updated" | "action-unavailable" | null;

type InitializationStatus = "preparing" | "ready" | "error";

const KEY_STATUS_PRIORITY: Record<WordleLetterStatus, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function useWordleGame(
  puzzle: WordlePuzzlePreview,
  startMode: "resume" | "new",
  initializationRequest: string,
) {
  const bootstrap = useAnonymousPlayerBootstrap();
  const [attempt, setAttempt] = useState<WordleAttemptSnapshot | null>(null);
  const [initializationStatus, setInitializationStatus] =
    useState<InitializationStatus>("preparing");
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [initializationNeedsBootstrap, setInitializationNeedsBootstrap] =
    useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [currentGuess, setCurrentGuess] = useState("");
  const [feedback, setFeedback] = useState<WordleFeedback>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [incompleteAttempt, setIncompleteAttempt] = useState(0);
  const [revealingGuessIndex, setRevealingGuessIndex] = useState<number | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializationGeneration = useRef(0);
  const lifecycleGeneration = useRef(0);
  const lifecycleKey = `${puzzle.id}:${startMode}:${initializationRequest}`;
  const lifecycleKeyRef = useRef(lifecycleKey);
  const submissionInFlight = useRef(false);
  const revealTimer = useRef<number | null>(null);

  const clearReveal = useCallback(() => {
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }

    setRevealingGuessIndex(null);
  }, []);

  const beginReveal = useCallback((guessIndex: number) => {
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
    }

    setRevealingGuessIndex(guessIndex);
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    revealTimer.current = window.setTimeout(
      () => {
        setRevealingGuessIndex((currentIndex) =>
          currentIndex === guessIndex ? null : currentIndex,
        );
        revealTimer.current = null;
      },
      prefersReducedMotion ? 0 : WORDLE_REVEAL_DURATION_MS,
    );
  }, []);

  const installInitialAttempt = useCallback(
    (nextAttempt: WordleAttemptSnapshot) => {
      clearReveal();
      setAttempt(nextAttempt);
      setCurrentGuess("");
      setFeedback(null);
      setRequestError(null);
      setIncompleteAttempt(0);
      setInitializationError(null);
      setInitializationNeedsBootstrap(false);
      setInitializationStatus("ready");
    },
    [clearReveal],
  );

  useEffect(() => {
    if (lifecycleKeyRef.current === lifecycleKey) {
      return;
    }

    lifecycleKeyRef.current = lifecycleKey;
    initializationGeneration.current += 1;
    lifecycleGeneration.current += 1;
    submissionInFlight.current = false;
    clearReveal();
    setAttempt(null);
    setInitializationStatus("preparing");
    setInitializationError(null);
    setInitializationNeedsBootstrap(false);
    setInitializationAttempt(0);
    setCurrentGuess("");
    setFeedback(null);
    setRequestError(null);
    setIncompleteAttempt(0);
    setIsSubmitting(false);
  }, [clearReveal, lifecycleKey]);

  useEffect(() => {
    if (attempt || bootstrap.status !== "ready") {
      return;
    }

    const generation = ++initializationGeneration.current;

    void requestWordleAttempt({ puzzleId: puzzle.id, startMode }).then(
      (result) => {
        if (initializationGeneration.current !== generation) {
          return;
        }

        if (result.status === "ready") {
          installInitialAttempt(result.attempt);
          return;
        }

        setInitializationStatus("error");
        setInitializationError(getInitializationError(result.error));
        setInitializationNeedsBootstrap(isPlayerReadinessError(result.error));
      },
      () => {
        if (initializationGeneration.current === generation) {
          setInitializationStatus("error");
          setInitializationError(
            "We couldn’t load this game. Check your connection and try again.",
          );
          setInitializationNeedsBootstrap(false);
        }
      },
    );

    return () => {
      if (initializationGeneration.current === generation) {
        initializationGeneration.current += 1;
      }
    };
  }, [
    attempt,
    bootstrap.status,
    initializationAttempt,
    installInitialAttempt,
    puzzle.id,
    startMode,
  ]);

  useEffect(() => {
    return () => {
      initializationGeneration.current += 1;
      lifecycleGeneration.current += 1;

      if (revealTimer.current !== null) {
        window.clearTimeout(revealTimer.current);
        revealTimer.current = null;
      }
    };
  }, []);

  const canInteract =
    initializationStatus === "ready" &&
    bootstrap.status === "ready" &&
    attempt?.gameStatus === "playing" &&
    !isSubmitting;

  const retryInitialization = useCallback(() => {
    setInitializationError(null);
    setInitializationStatus("preparing");

    if (bootstrap.status !== "ready" || initializationNeedsBootstrap) {
      bootstrap.retry();
    }

    setInitializationAttempt((current) => current + 1);
  }, [bootstrap, initializationNeedsBootstrap]);

  const addLetter = useCallback(
    (letter: string) => {
      if (!/^[A-Za-z]$/.test(letter)) {
        throw new Error("Wordle input must be one ASCII letter.");
      }

      if (!canInteract) {
        return;
      }

      if (currentGuess.length >= WORDLE_WORD_LENGTH) {
        return;
      }

      setCurrentGuess(`${currentGuess}${letter.toUpperCase()}`);
      setFeedback(null);
      setRequestError(null);
    },
    [canInteract, currentGuess],
  );

  const backspace = useCallback(() => {
    if (!canInteract) {
      return;
    }

    if (!currentGuess) {
      return;
    }

    setCurrentGuess(currentGuess.slice(0, -1));
    setFeedback(null);
    setRequestError(null);
  }, [canInteract, currentGuess]);

  const handleSubmissionError = useCallback(
    (error: WordleGameplayErrorCode, latestAttempt?: WordleAttemptSnapshot) => {
      if (error === "invalid_word" && latestAttempt) {
        setAttempt(latestAttempt);
        setFeedback("invalid-word");
        setRequestError(null);
        return;
      }

      if (
        latestAttempt &&
        (error === "stale_attempt" || error === "invalid_action")
      ) {
        clearReveal();
        setAttempt(latestAttempt);
        setCurrentGuess((current) =>
          latestAttempt.gameStatus === "playing" ? current : "",
        );
        setFeedback(
          error === "stale_attempt" ? "updated" : "action-unavailable",
        );
        setRequestError(null);
        return;
      }

      if (isPlayerReadinessError(error)) {
        bootstrap.retry();
      }

      setRequestError(getRequestError(error));
    },
    [bootstrap, clearReveal],
  );

  const submitGuess = useCallback(async () => {
    if (!attempt || !canInteract || submissionInFlight.current) {
      return;
    }

    if (currentGuess.length !== WORDLE_WORD_LENGTH) {
      setFeedback("incomplete");
      setIncompleteAttempt((current) => current + 1);
      return;
    }

    const generation = lifecycleGeneration.current;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const result = await requestWordleGuess(attempt.attemptId, {
        guess: currentGuess,
        version: attempt.version,
      });

      if (lifecycleGeneration.current !== generation) {
        return;
      }

      if (result.status === "error") {
        handleSubmissionError(result.error, result.attempt);
        return;
      }

      const acceptedGuessIndex = result.attempt.submittedGuesses.length - 1;
      const acceptedOneGuess =
        result.attempt.version === attempt.version + 1 &&
        result.attempt.submittedGuesses.length ===
          attempt.submittedGuesses.length + 1;

      setAttempt(result.attempt);
      setCurrentGuess("");
      setFeedback(null);
      setRequestError(null);

      if (acceptedOneGuess) {
        beginReveal(acceptedGuessIndex);
      } else {
        clearReveal();
      }
    } catch {
      if (lifecycleGeneration.current === generation) {
        setRequestError(
          "We couldn’t submit that guess. Your word is still here; try again.",
        );
      }
    } finally {
      if (lifecycleGeneration.current === generation) {
        submissionInFlight.current = false;
        setIsSubmitting(false);
      }
    }
  }, [
    attempt,
    beginReveal,
    canInteract,
    clearReveal,
    currentGuess,
    handleSubmissionError,
  ]);

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
        void submitGuess();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addLetter, backspace, submitGuess]);

  const keyboardStatuses = useMemo(
    () =>
      deriveKeyboardStatuses(
        attempt?.submittedGuesses ?? [],
        revealingGuessIndex,
      ),
    [attempt?.submittedGuesses, revealingGuessIndex],
  );
  const bootstrapFailedBeforeInitialization =
    attempt === null && bootstrap.status === "error";

  return {
    initializationStatus: bootstrapFailedBeforeInitialization
      ? "error"
      : initializationStatus,
    initializationError: bootstrapFailedBeforeInitialization
      ? "We couldn’t prepare your player session."
      : initializationError,
    currentGuess,
    submittedGuesses: attempt?.submittedGuesses ?? [],
    gameStatus: attempt?.gameStatus ?? null,
    revealedAnswer: attempt?.revealedAnswer,
    keyboardStatuses,
    feedback,
    requestError,
    incompleteAttempt,
    revealingGuessIndex,
    canInteract,
    isSubmitting,
    retryInitialization,
    addLetter,
    backspace,
    submitGuess,
  };
}

export function deriveKeyboardStatuses(
  submittedGuesses: WordleSubmittedGuess[],
  excludedGuessIndex: number | null = null,
): WordleKeyboardStatuses {
  const statuses: WordleKeyboardStatuses = {};

  for (const [guessIndex, { evaluation }] of submittedGuesses.entries()) {
    if (guessIndex === excludedGuessIndex) {
      continue;
    }

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

function isPlayerReadinessError(error: WordleGameplayErrorCode) {
  return (
    error === "authenticated_player_required" || error === "player_not_ready"
  );
}

function getInitializationError(error: WordleGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session isn’t ready yet. Try preparing it again.";
  }

  if (error === "wordle_resource_not_found") {
    return "This Wordle puzzle is no longer available.";
  }

  return "We couldn’t load this game. Check your connection and try again.";
}

function getRequestError(error: WordleGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session needs to reconnect before you submit again.";
  }

  if (error === "wordle_resource_not_found") {
    return "This Wordle game is no longer available.";
  }

  return "We couldn’t submit that guess. Your word is still here; try again.";
}
