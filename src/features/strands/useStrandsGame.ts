"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAnonymousPlayerBootstrap } from "@/app/games/AnonymousPlayerBootstrap";
import type {
  PublicStrandsPuzzle,
  RevealedStrandsAnswer,
  StrandsAttemptSnapshot,
  StrandsGameplayErrorCode,
  StrandsPathOutcome,
} from "@/contracts/strands";
import { STRANDS_MIN_WORD_LENGTH } from "@/domain/strands/types";

import {
  requestStrandsAttempt,
  requestStrandsHint,
  requestStrandsPath,
} from "./strandsApiClient";
import { saveLastVisitedStrandsPuzzleId } from "./strandsProgressStorage";
import {
  getSelectedStrandsWord,
  updateStrandsSelection,
} from "./strandsSelection";

type StrandsFeedback =
  | { kind: "found-theme"; message: string }
  | { kind: "found-spangram"; message: string }
  | { kind: "already-found"; message: string }
  | { kind: "not-theme"; message: string }
  | { kind: "invalid-path"; message: string }
  | { kind: "hint"; message: string }
  | { kind: "updated"; message: string }
  | { kind: "action-unavailable"; message: string }
  | { kind: "complete"; message: string }
  | null;

type InitializationStatus = "preparing" | "ready" | "error";

export function useStrandsGame(puzzle: PublicStrandsPuzzle) {
  const bootstrap = useAnonymousPlayerBootstrap();
  const [attempt, setAttempt] = useState<StrandsAttemptSnapshot | null>(null);
  const [initializationStatus, setInitializationStatus] =
    useState<InitializationStatus>("preparing");
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [initializationNeedsBootstrap, setInitializationNeedsBootstrap] =
    useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const selectedPathRef = useRef<number[]>([]);
  const [feedback, setFeedback] = useState<StrandsFeedback>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const initializationGeneration = useRef(0);
  const lifecycleGeneration = useRef(0);
  const submissionInFlight = useRef(false);
  const hintInFlight = useRef(false);
  const replayInFlight = useRef(false);

  const commitSelectedPath = useCallback((nextPath: number[]) => {
    selectedPathRef.current = nextPath;
    setSelectedPath(nextPath);
  }, []);

  const installAttempt = useCallback(
    (nextAttempt: StrandsAttemptSnapshot) => {
      if (nextAttempt.puzzle.id !== puzzle.id) {
        throw new Error("Strands Attempt returned the wrong puzzle.");
      }

      setAttempt(nextAttempt);
      commitSelectedPath([]);
      setFeedback(null);
      setRequestError(null);
      setInitializationError(null);
      setInitializationNeedsBootstrap(false);
      setInitializationStatus("ready");
    },
    [commitSelectedPath, puzzle.id],
  );

  useEffect(() => {
    saveLastVisitedStrandsPuzzleId(puzzle.id);
  }, [puzzle.id]);

  useEffect(() => {
    if (attempt || bootstrap.status !== "ready") {
      return;
    }

    const generation = ++initializationGeneration.current;

    void requestStrandsAttempt({ puzzleId: puzzle.id }).then(
      (result) => {
        if (initializationGeneration.current !== generation) {
          return;
        }

        if (result.status === "ready") {
          installAttempt(result.attempt);
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
    installAttempt,
    puzzle.id,
  ]);

  useEffect(() => {
    return () => {
      initializationGeneration.current += 1;
      lifecycleGeneration.current += 1;
      submissionInFlight.current = false;
      hintInFlight.current = false;
      replayInFlight.current = false;
    };
  }, []);

  const foundAnswers = attempt?.foundAnswers ?? [];
  const claimedTileIndexes = useMemo(
    () => foundAnswers.flatMap(({ path }) => path),
    [foundAnswers],
  );
  const claimedTileSet = useMemo(
    () => new Set(claimedTileIndexes),
    [claimedTileIndexes],
  );
  const selectedWord = useMemo(
    () => getSelectedStrandsWord(puzzle, selectedPath),
    [puzzle, selectedPath],
  );
  const gameStatus = attempt?.gameStatus ?? null;
  const isBusy = isSubmitting || isRequestingHint || isReplaying;
  const canInteract =
    initializationStatus === "ready" &&
    bootstrap.status === "ready" &&
    gameStatus === "playing" &&
    !isBusy;
  const foundThemeCount = foundAnswers.filter(
    ({ kind }) => kind === "theme",
  ).length;
  const canHint =
    canInteract &&
    (attempt?.hintedTileIndexes !== null ||
      foundThemeCount < puzzle.answerCount - 1);
  const canSubmit =
    canInteract && selectedPath.length >= STRANDS_MIN_WORD_LENGTH;

  const retryInitialization = useCallback(() => {
    setInitializationError(null);
    setInitializationStatus("preparing");

    if (bootstrap.status !== "ready" || initializationNeedsBootstrap) {
      bootstrap.retry();
    }

    setInitializationAttempt((current) => current + 1);
  }, [bootstrap, initializationNeedsBootstrap]);

  const selectTile = useCallback(
    (tileIndex: number) => {
      if (!canInteract) {
        return;
      }

      setFeedback(null);
      setRequestError(null);
      commitSelectedPath(
        updateStrandsSelection(
          puzzle,
          selectedPathRef.current,
          claimedTileSet,
          tileIndex,
        ),
      );
    },
    [canInteract, claimedTileSet, commitSelectedPath, puzzle],
  );

  const clearSelection = useCallback(() => {
    if (!canInteract) {
      return;
    }

    setFeedback(null);
    setRequestError(null);
    commitSelectedPath([]);
  }, [canInteract, commitSelectedPath]);

  const handleActionError = useCallback(
    (
      error: StrandsGameplayErrorCode,
      latestAttempt?: StrandsAttemptSnapshot,
    ) => {
      if (
        latestAttempt &&
        (error === "stale_attempt" || error === "invalid_action")
      ) {
        setAttempt(latestAttempt);
        commitSelectedPath([]);
        setFeedback(
          error === "stale_attempt"
            ? {
                kind: "updated",
                message: "Your game was updated. Make a new selection.",
              }
            : {
                kind: "action-unavailable",
                message: "That action is no longer available.",
              },
        );
        setRequestError(null);
        return;
      }

      if (isPlayerReadinessError(error)) {
        bootstrap.retry();
      }

      setRequestError(getRequestError(error));
    },
    [bootstrap, commitSelectedPath],
  );

  const submitSelection = useCallback(async () => {
    if (!attempt || !canInteract || submissionInFlight.current) {
      return;
    }

    const path = [...selectedPathRef.current];

    if (path.length < STRANDS_MIN_WORD_LENGTH) {
      commitSelectedPath([]);
      setFeedback({
        kind: "invalid-path",
        message: "Select at least four adjacent letters.",
      });
      return;
    }

    const generation = lifecycleGeneration.current;
    const submittedWord = getSelectedStrandsWord(puzzle, path);
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const result = await requestStrandsPath(attempt.attemptId, {
        path,
        version: attempt.version,
      });

      if (lifecycleGeneration.current !== generation) {
        return;
      }

      if (result.status === "error") {
        handleActionError(result.error, result.attempt);
        return;
      }

      const newlyFoundAnswer = getNewlyFoundAnswer(
        attempt.foundAnswers,
        result.attempt.foundAnswers,
      );

      setAttempt(result.attempt);
      commitSelectedPath([]);
      setRequestError(null);
      setFeedback(
        getSubmissionFeedback(
          result.outcome,
          submittedWord,
          newlyFoundAnswer,
        ),
      );
    } catch {
      if (lifecycleGeneration.current === generation) {
        setRequestError(
          "We couldn’t submit that path. Your selection is still here; try again.",
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
    canInteract,
    commitSelectedPath,
    handleActionError,
    puzzle,
  ]);

  const showHint = useCallback(async () => {
    if (!attempt || !canHint || hintInFlight.current) {
      return;
    }

    const generation = lifecycleGeneration.current;
    hintInFlight.current = true;
    setIsRequestingHint(true);
    setRequestError(null);

    try {
      const result = await requestStrandsHint(attempt.attemptId, {
        version: attempt.version,
      });

      if (lifecycleGeneration.current !== generation) {
        return;
      }

      if (result.status === "error") {
        handleActionError(result.error, result.attempt);
        return;
      }

      setAttempt(result.attempt);
      setFeedback({
        kind: "hint",
        message: "Hint highlighted on the board.",
      });
      setRequestError(null);
    } catch {
      if (lifecycleGeneration.current === generation) {
        setRequestError(
          "We couldn’t load a hint. Your game is unchanged; try again.",
        );
      }
    } finally {
      if (lifecycleGeneration.current === generation) {
        hintInFlight.current = false;
        setIsRequestingHint(false);
      }
    }
  }, [attempt, canHint, handleActionError]);

  const playAgain = useCallback(async () => {
    if (
      !attempt ||
      attempt.gameStatus !== "complete" ||
      bootstrap.status !== "ready" ||
      replayInFlight.current
    ) {
      return;
    }

    const generation = lifecycleGeneration.current;
    replayInFlight.current = true;
    setIsReplaying(true);
    setRequestError(null);

    try {
      const result = await requestStrandsAttempt({ puzzleId: puzzle.id });

      if (lifecycleGeneration.current !== generation) {
        return;
      }

      if (result.status === "error") {
        if (isPlayerReadinessError(result.error)) {
          bootstrap.retry();
        }

        setRequestError(getReplayError(result.error));
        return;
      }

      installAttempt(result.attempt);
    } catch {
      if (lifecycleGeneration.current === generation) {
        setRequestError(
          "We couldn’t start another game. Your completed game is still here; try again.",
        );
      }
    } finally {
      if (lifecycleGeneration.current === generation) {
        replayInFlight.current = false;
        setIsReplaying(false);
      }
    }
  }, [attempt, bootstrap, installAttempt, puzzle.id]);

  const bootstrapFailedBeforeInitialization =
    attempt === null && bootstrap.status === "error";

  return {
    initializationStatus: bootstrapFailedBeforeInitialization
      ? "error"
      : initializationStatus,
    initializationError: bootstrapFailedBeforeInitialization
      ? "We couldn’t prepare your player session."
      : initializationError,
    selectedPath,
    selectedWord,
    foundAnswers,
    foundWords: foundAnswers.map(({ word }) => word),
    claimedTileIndexes,
    hintedTileIndexes: attempt?.hintedTileIndexes ?? [],
    gameStatus,
    feedback,
    requestError,
    canInteract,
    canHint,
    canSubmit,
    canReplay:
      bootstrap.status === "ready" &&
      attempt?.gameStatus === "complete" &&
      !isReplaying,
    answerCount: attempt?.puzzle.answerCount ?? puzzle.answerCount,
    isSubmitting,
    isRequestingHint,
    isReplaying,
    retryInitialization,
    selectTile,
    clearSelection,
    submitSelection,
    showHint,
    playAgain,
  };
}

function getNewlyFoundAnswer(
  previousAnswers: RevealedStrandsAnswer[],
  nextAnswers: RevealedStrandsAnswer[],
) {
  const previousWords = new Set(previousAnswers.map(({ word }) => word));

  return nextAnswers.find(({ word }) => !previousWords.has(word));
}

function getSubmissionFeedback(
  outcome: StrandsPathOutcome,
  submittedWord: string,
  newlyFoundAnswer?: RevealedStrandsAnswer,
): StrandsFeedback {
  switch (outcome) {
    case "found_theme":
      return {
        kind: "found-theme",
        message: newlyFoundAnswer
          ? `Found: ${newlyFoundAnswer.word}`
          : "Found a theme word.",
      };
    case "found_spangram":
      return {
        kind: "found-spangram",
        message: newlyFoundAnswer
          ? `Spangram found: ${newlyFoundAnswer.word}`
          : "Spangram found!",
      };
    case "already_found":
      return {
        kind: "already-found",
        message: `${submittedWord} is already found.`,
      };
    case "not_theme":
      return { kind: "not-theme", message: "Not a theme word." };
    case "invalid_path":
      return {
        kind: "invalid-path",
        message: "Select at least four adjacent letters.",
      };
    case "game_complete":
      return { kind: "complete", message: "Puzzle complete!" };
  }
}

function isPlayerReadinessError(error: StrandsGameplayErrorCode) {
  return (
    error === "authenticated_player_required" || error === "player_not_ready"
  );
}

function getInitializationError(error: StrandsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session isn’t ready yet. Try preparing it again.";
  }

  if (error === "strands_resource_not_found") {
    return "This Strands puzzle is no longer available.";
  }

  return "We couldn’t load this game. Check your connection and try again.";
}

function getRequestError(error: StrandsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session needs to reconnect before you continue.";
  }

  if (error === "strands_resource_not_found") {
    return "This Strands game is no longer available.";
  }

  return "We couldn’t update this game. Try again.";
}

function getReplayError(error: StrandsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session needs to reconnect before you play again.";
  }

  if (error === "strands_resource_not_found") {
    return "This Strands puzzle is no longer available.";
  }

  return "We couldn’t start another game. Try again.";
}
