import { useCallback, useEffect, useRef, useState } from "react";

import { useAnonymousPlayerBootstrap } from "@/app/games/AnonymousPlayerBootstrap";
import type {
  ConnectionsAttemptSnapshot,
  ConnectionsGameplayErrorCode,
  ConnectionsPuzzlePreview,
  PublicConnectionsTile,
} from "@/contracts/connections";
import { CONNECTIONS_GROUP_SIZE } from "@/domain/connections/types";

import {
  requestConnectionsAttempt,
  requestConnectionsGuess,
} from "./connectionsApiClient";
import {
  selectConnectionsReactionPhoto,
  type ConnectionsReaction,
  type ConnectionsReactionKind,
} from "./connectionsReactions";

const CORRECT_RESOLUTION_DURATION_MS = 300;
const INTERMEDIATE_REACTION_DURATION_MS = 1850;

export type ConnectionsFeedback =
  | "incorrect"
  | "one-away"
  | "duplicate"
  | "correct"
  | "updated"
  | "action-unavailable"
  | null;

type InitializationStatus = "preparing" | "ready" | "error";

export function useConnectionsGame(puzzle: ConnectionsPuzzlePreview) {
  const bootstrap = useAnonymousPlayerBootstrap();
  const [attempt, setAttempt] = useState<ConnectionsAttemptSnapshot | null>(
    null,
  );
  const [initializationStatus, setInitializationStatus] =
    useState<InitializationStatus>("preparing");
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [initializationNeedsBootstrap, setInitializationNeedsBootstrap] =
    useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [tileOrder, setTileOrder] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<ConnectionsFeedback>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [correctGuessTileIds, setCorrectGuessTileIds] = useState<string[]>([]);
  const [feedbackAttempt, setFeedbackAttempt] = useState(0);
  const [reaction, setReaction] = useState<ConnectionsReaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const reactionOccurrence = useRef(0);
  const reactionTimer = useRef<number | null>(null);
  const correctResolutionTimer = useRef<number | null>(null);
  const initializationGeneration = useRef(0);
  const submissionInFlight = useRef(false);
  const replayInFlight = useRef(false);
  const currentGameReactionUsage = useRef(createReactionUsage());
  const previousGameReactionUsage = useRef(createReactionUsage());

  const clearReaction = useCallback(() => {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = null;
    }

    setReaction(null);
  }, []);

  const showReaction = useCallback(
    (kind: ConnectionsReactionKind, persistent = false) => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
        reactionTimer.current = null;
      }

      reactionOccurrence.current += 1;

      const src = selectConnectionsReactionPhoto(
        kind,
        currentGameReactionUsage.current[kind],
        previousGameReactionUsage.current[kind],
      );

      if (src === null) {
        setReaction(null);
        return;
      }

      currentGameReactionUsage.current[kind].add(src);

      const nextReaction = {
        occurrence: reactionOccurrence.current,
        kind,
        src,
      };

      setReaction(nextReaction);

      if (!persistent) {
        reactionTimer.current = window.setTimeout(() => {
          setReaction((currentReaction) =>
            currentReaction?.occurrence === nextReaction.occurrence
              ? null
              : currentReaction,
          );
          reactionTimer.current = null;
        }, INTERMEDIATE_REACTION_DURATION_MS);
      }
    },
    [],
  );

  const installInitialAttempt = useCallback(
    (nextAttempt: ConnectionsAttemptSnapshot) => {
      clearReaction();
      clearCorrectResolutionTimer(correctResolutionTimer);
      setAttempt(nextAttempt);
      setTileOrder(nextAttempt.remainingTiles.map((tile) => tile.id));
      setSelectedTileIds([]);
      setFeedback(null);
      setRequestError(null);
      setCorrectGuessTileIds([]);
      setFeedbackAttempt(0);
      setInitializationError(null);
      setInitializationNeedsBootstrap(false);
      setInitializationStatus("ready");

      if (nextAttempt.gameStatus === "won") {
        showReaction("win", true);
      } else if (nextAttempt.gameStatus === "lost") {
        showReaction("loss", true);
      }
    },
    [clearReaction, showReaction],
  );

  useEffect(() => {
    if (attempt) {
      return;
    }

    if (bootstrap.status === "pending") {
      return;
    }

    if (bootstrap.status === "error") {
      return;
    }

    const generation = ++initializationGeneration.current;

    void requestConnectionsAttempt({ puzzleId: puzzle.id }).then(
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
  ]);

  useEffect(() => {
    return () => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
        reactionTimer.current = null;
      }
      clearCorrectResolutionTimer(correctResolutionTimer);
    };
  }, []);

  const isResolvingCorrectGuess = correctGuessTileIds.length > 0;
  const isBusy = isSubmitting || isReplaying || isResolvingCorrectGuess;
  const canInteract =
    initializationStatus === "ready" &&
    bootstrap.status === "ready" &&
    attempt?.gameStatus === "playing" &&
    !isBusy;

  function retryInitialization() {
    setInitializationError(null);
    setInitializationStatus("preparing");

    if (bootstrap.status !== "ready" || initializationNeedsBootstrap) {
      bootstrap.retry();
    }

    setInitializationAttempt((current) => current + 1);
  }

  function toggleTile(tileId: string) {
    if (!canInteract) {
      return;
    }

    setFeedback(null);
    setRequestError(null);
    setSelectedTileIds((currentTileIds) => {
      if (currentTileIds.includes(tileId)) {
        return currentTileIds.filter((id) => id !== tileId);
      }

      if (currentTileIds.length >= CONNECTIONS_GROUP_SIZE) {
        return currentTileIds;
      }

      return [...currentTileIds, tileId];
    });
  }

  function shuffleTiles() {
    if (!canInteract) {
      return;
    }

    setTileOrder((currentOrder) => shuffle(currentOrder));
  }

  async function submitGuess() {
    if (
      !attempt ||
      !canInteract ||
      selectedTileIds.length !== CONNECTIONS_GROUP_SIZE ||
      submissionInFlight.current
    ) {
      return;
    }

    submissionInFlight.current = true;
    setIsSubmitting(true);
    setRequestError(null);
    const submittedTileIds = [...selectedTileIds];

    try {
      const result = await requestConnectionsGuess(attempt.attemptId, {
        tileIds: submittedTileIds,
        version: attempt.version,
      });

      if (result.status === "error") {
        handleSubmissionError(result.error, result.attempt);
        return;
      }

      handleSubmittedGuess(result.outcome, result.attempt, submittedTileIds);
    } catch {
      setRequestError(
        "We couldn’t submit that guess. Your selection is still here; try again.",
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmittedGuess(
    outcome: "correct" | "incorrect" | "one_away" | "duplicate",
    nextAttempt: ConnectionsAttemptSnapshot,
    submittedTileIds: string[],
  ) {
    setRequestError(null);

    if (outcome === "correct") {
      clearReaction();
      setFeedback("correct");
      setCorrectGuessTileIds(submittedTileIds);

      if (nextAttempt.gameStatus === "playing") {
        showReaction("correct");
      }

      clearCorrectResolutionTimer(correctResolutionTimer);
      correctResolutionTimer.current = window.setTimeout(() => {
        setAttempt(nextAttempt);
        setTileOrder((currentOrder) =>
          reconcileTileOrder(currentOrder, nextAttempt.remainingTiles),
        );
        setSelectedTileIds([]);
        setCorrectGuessTileIds([]);
        setFeedback(null);
        correctResolutionTimer.current = null;

        if (nextAttempt.gameStatus === "won") {
          showReaction("win", true);
        }
      }, CORRECT_RESOLUTION_DURATION_MS);
      return;
    }

    setAttempt(nextAttempt);
    setTileOrder((currentOrder) =>
      reconcileTileOrder(currentOrder, nextAttempt.remainingTiles),
    );

    if (nextAttempt.gameStatus === "lost") {
      setSelectedTileIds([]);
      setFeedback(null);
      clearReaction();
      showReaction("loss", true);
      return;
    }

    if (outcome === "duplicate") {
      setSelectedTileIds((currentSelection) =>
        filterSelection(currentSelection, nextAttempt),
      );
      clearReaction();
      setFeedback("duplicate");
      setFeedbackAttempt((current) => current + 1);
      return;
    }

    setFeedback(outcome === "one_away" ? "one-away" : "incorrect");
    setFeedbackAttempt((current) => current + 1);
    showReaction("incorrect");
  }

  function handleSubmissionError(
    error: ConnectionsGameplayErrorCode,
    latestAttempt?: ConnectionsAttemptSnapshot,
  ) {
    if (
      latestAttempt &&
      (error === "stale_attempt" || error === "invalid_action")
    ) {
      clearReaction();
      clearCorrectResolutionTimer(correctResolutionTimer);
      setAttempt(latestAttempt);
      setTileOrder((currentOrder) =>
        reconcileTileOrder(currentOrder, latestAttempt.remainingTiles),
      );
      setSelectedTileIds((currentSelection) =>
        filterSelection(currentSelection, latestAttempt),
      );
      setCorrectGuessTileIds([]);
      setFeedback(error === "stale_attempt" ? "updated" : "action-unavailable");

      if (latestAttempt.gameStatus === "won") {
        showReaction("win", true);
      } else if (latestAttempt.gameStatus === "lost") {
        showReaction("loss", true);
      }
      return;
    }

    if (isPlayerReadinessError(error)) {
      bootstrap.retry();
    }

    setRequestError(getRequestError(error));
  }

  async function playAgain() {
    if (
      !attempt ||
      attempt.gameStatus === "playing" ||
      bootstrap.status !== "ready" ||
      replayInFlight.current
    ) {
      return;
    }

    replayInFlight.current = true;
    setIsReplaying(true);
    setRequestError(null);

    try {
      const result = await requestConnectionsAttempt({
        puzzleId: puzzle.id,
        replayFromAttemptId: attempt.attemptId,
      });

      if (result.status === "error") {
        if (isPlayerReadinessError(result.error)) {
          bootstrap.retry();
        }

        setRequestError(getReplayError(result.error));
        return;
      }

      previousGameReactionUsage.current = copyReactionUsage(
        currentGameReactionUsage.current,
      );
      currentGameReactionUsage.current = createReactionUsage();
      installInitialAttempt(result.attempt);
    } catch {
      setRequestError(
        "We couldn’t start another game. Your completed game is still here; try again.",
      );
    } finally {
      replayInFlight.current = false;
      setIsReplaying(false);
    }
  }

  const orderedTiles = orderTiles(tileOrder, attempt?.remainingTiles ?? []);
  const canSubmit =
    canInteract && selectedTileIds.length === CONNECTIONS_GROUP_SIZE;
  const bootstrapFailedBeforeInitialization =
    attempt === null && bootstrap.status === "error";

  return {
    initializationStatus: bootstrapFailedBeforeInitialization
      ? "error"
      : initializationStatus,
    initializationError: bootstrapFailedBeforeInitialization
      ? "We couldn’t prepare your player session."
      : initializationError,
    selectedTileIds,
    orderedTiles,
    displayedGroups: attempt?.displayedGroups ?? [],
    gameStatus: attempt?.gameStatus ?? null,
    mistakesRemaining: attempt?.mistakesRemaining ?? null,
    feedback,
    requestError,
    correctGuessTileIds,
    feedbackAttempt,
    reaction,
    selectionLimit: CONNECTIONS_GROUP_SIZE,
    canInteract,
    canSubmit,
    canReplay: bootstrap.status === "ready" && !isReplaying,
    isSubmitting,
    isReplaying,
    retryInitialization,
    toggleTile,
    shuffleTiles,
    submitGuess,
    playAgain,
  };
}

type ConnectionsReactionUsage = Record<ConnectionsReactionKind, Set<string>>;

function createReactionUsage(): ConnectionsReactionUsage {
  return {
    correct: new Set(),
    incorrect: new Set(),
    loss: new Set(),
    win: new Set(),
  };
}

function copyReactionUsage(
  usage: ConnectionsReactionUsage,
): ConnectionsReactionUsage {
  return {
    correct: new Set(usage.correct),
    incorrect: new Set(usage.incorrect),
    loss: new Set(usage.loss),
    win: new Set(usage.win),
  };
}

function orderTiles(
  tileOrder: string[],
  remainingTiles: PublicConnectionsTile[],
) {
  const tileById = new Map(remainingTiles.map((tile) => [tile.id, tile]));

  return tileOrder.flatMap((tileId) => {
    const tile = tileById.get(tileId);

    return tile ? [tile] : [];
  });
}

function reconcileTileOrder(
  currentOrder: string[],
  remainingTiles: PublicConnectionsTile[],
) {
  const remainingIds = new Set(remainingTiles.map((tile) => tile.id));
  const survivingOrder = currentOrder.filter((tileId) =>
    remainingIds.has(tileId),
  );
  const survivingIds = new Set(survivingOrder);

  return [
    ...survivingOrder,
    ...remainingTiles
      .map((tile) => tile.id)
      .filter((tileId) => !survivingIds.has(tileId)),
  ];
}

function filterSelection(
  selectedTileIds: string[],
  attempt: ConnectionsAttemptSnapshot,
) {
  const remainingIds = new Set(attempt.remainingTiles.map((tile) => tile.id));

  return selectedTileIds.filter((tileId) => remainingIds.has(tileId));
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function clearCorrectResolutionTimer(timer: { current: number | null }) {
  if (timer.current !== null) {
    window.clearTimeout(timer.current);
    timer.current = null;
  }
}

function isPlayerReadinessError(error: ConnectionsGameplayErrorCode) {
  return (
    error === "authenticated_player_required" || error === "player_not_ready"
  );
}

function getInitializationError(error: ConnectionsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session isn’t ready yet. Try preparing it again.";
  }

  if (error === "connections_resource_not_found") {
    return "This Connections puzzle is no longer available.";
  }

  return "We couldn’t load this game. Check your connection and try again.";
}

function getRequestError(error: ConnectionsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session needs to reconnect before you submit again.";
  }

  if (error === "connections_resource_not_found") {
    return "This game is no longer available.";
  }

  return "We couldn’t submit that guess. Your selection is still here; try again.";
}

function getReplayError(error: ConnectionsGameplayErrorCode) {
  if (isPlayerReadinessError(error)) {
    return "Your player session needs to reconnect before you play again.";
  }

  if (error === "attempt_not_complete") {
    return "This game isn’t ready to replay. Refresh to recover its latest state.";
  }

  return "We couldn’t start another game. Your completed game is still here; try again.";
}
