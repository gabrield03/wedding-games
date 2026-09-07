"use client";

import { useEffect, useMemo, useState } from "react";

import {
  checkMiniCrosswordEntry,
  clearMiniCrosswordCell,
  clearMiniCrosswordEntry,
  createInitialMiniCrosswordGameState,
  isMiniCrosswordBoardFilled,
  isMiniCrosswordEntryFilled,
  resetMiniCrosswordGame,
  setMiniCrosswordCellLetter,
  submitMiniCrossword,
} from "@/domain/miniCrossword/gameplay";
import type {
  MiniCrosswordCell,
  MiniCrosswordDirection,
  MiniCrosswordEntry,
  MiniCrosswordPuzzle,
} from "@/domain/miniCrossword/types";

import {
  clearMiniCrosswordPuzzleProgress,
  loadMiniCrosswordPuzzleProgress,
  saveLastVisitedMiniCrosswordPuzzleId,
  saveMiniCrosswordPuzzleProgress,
} from "./miniCrosswordProgressStorage";

type MiniCrosswordFeedback =
  | "incorrect"
  | "complete"
  | "word-correct"
  | "word-incorrect"
  | null;

export function useMiniCrosswordGame(puzzle: MiniCrosswordPuzzle) {
  const initialEntry = puzzle.entries[0]!;
  const [persistedProgress] = useState(() =>
    loadMiniCrosswordPuzzleProgress(puzzle),
  );
  const [state, setState] = useState(() =>
    persistedProgress
      ? {
          letters: persistedProgress.letters,
          status: persistedProgress.status,
        }
      : createInitialMiniCrosswordGameState(puzzle),
  );
  const [selectedCell, setSelectedCell] = useState<MiniCrosswordCell>(
    initialEntry.cells[0]!,
  );
  const [activeDirection, setActiveDirection] =
    useState<MiniCrosswordDirection>(initialEntry.direction);
  const [feedback, setFeedback] = useState<MiniCrosswordFeedback>(null);

  const activeEntry = useMemo(
    () => findActiveEntry(puzzle, selectedCell, activeDirection),
    [activeDirection, puzzle, selectedCell],
  );

  useEffect(() => {
    saveLastVisitedMiniCrosswordPuzzleId(puzzle.id);
  }, [puzzle.id]);

  useEffect(() => {
    saveMiniCrosswordPuzzleProgress(puzzle, state);
  }, [puzzle, state]);

  function selectCell(cell: MiniCrosswordCell) {
    if (state.status === "complete") {
      return;
    }

    const entries = getEntriesForCell(puzzle, cell);

    if (entries.length === 0) {
      return;
    }

    const sameCell = cellsEqual(selectedCell, cell);
    let nextDirection = activeDirection;

    if (sameCell && entries.length > 1) {
      const currentIndex = entries.findIndex(
        ({ direction }) => direction === activeDirection,
      );
      nextDirection =
        entries[(currentIndex + 1 + entries.length) % entries.length]!
          .direction;
    } else if (
      !entries.some(({ direction }) => direction === activeDirection)
    ) {
      nextDirection =
        entries.find(({ direction }) => direction === "across")?.direction ??
        entries[0]!.direction;
    }

    setSelectedCell(cell);
    setActiveDirection(nextDirection);
    setFeedback(null);
  }

  function selectEntry(entry: MiniCrosswordEntry) {
    if (state.status === "complete") {
      return;
    }

    setSelectedCell(entry.cells[0]!);
    setActiveDirection(entry.direction);
    setFeedback(null);
  }

  function enterLetter(letter: string) {
    if (state.status === "complete") {
      return;
    }

    setState((current) =>
      setMiniCrosswordCellLetter(puzzle, current, selectedCell, letter),
    );
    setFeedback(null);

    const entry = findActiveEntry(puzzle, selectedCell, activeDirection);
    const selectedIndex = entry?.cells.findIndex((cell) =>
      cellsEqual(cell, selectedCell),
    );

    if (entry && selectedIndex !== undefined && selectedIndex >= 0) {
      const nextEmptyCell = entry.cells
        .slice(selectedIndex + 1)
        .find(
          (cell) =>
            state.letters[cell.row * puzzle.grid.columns + cell.column] ===
            null,
        );

      if (nextEmptyCell) {
        setSelectedCell(nextEmptyCell);
      }
    }
  }

  function backspace() {
    if (state.status === "complete") {
      return;
    }

    const entry = findActiveEntry(puzzle, selectedCell, activeDirection);
    const selectedEntryIndex = entry?.cells.findIndex((cell) =>
      cellsEqual(cell, selectedCell),
    );
    const selectedStateIndex =
      selectedCell.row * puzzle.grid.columns + selectedCell.column;
    const previousCell =
      entry && selectedEntryIndex !== undefined && selectedEntryIndex > 0
        ? entry.cells[selectedEntryIndex - 1]!
        : null;

    if (state.letters[selectedStateIndex] !== null || !previousCell) {
      setState((current) =>
        clearMiniCrosswordCell(puzzle, current, selectedCell),
      );
    } else {
      setState((current) =>
        clearMiniCrosswordCell(puzzle, current, previousCell),
      );
    }

    if (previousCell) {
      setSelectedCell(previousCell);
    }

    setFeedback(null);
  }

  function clearWord() {
    if (state.status === "complete" || !activeEntry) {
      return;
    }

    setState((current) =>
      clearMiniCrosswordEntry(puzzle, current, activeEntry),
    );
    setFeedback(null);
  }

  function checkWord() {
    if (state.status === "complete" || !activeEntry) {
      return;
    }

    const result = checkMiniCrosswordEntry(puzzle, state, activeEntry);

    if (result === "correct") {
      setFeedback("word-correct");
    } else if (result === "incorrect") {
      setFeedback("word-incorrect");
    }
  }

  function submit() {
    const result = submitMiniCrossword(puzzle, state);
    setState(result.state);

    if (result.status === "incorrect") {
      setFeedback("incorrect");
    } else if (result.status === "correct") {
      setFeedback("complete");
    }
  }

  function playAgain() {
    clearMiniCrosswordPuzzleProgress(puzzle.id);
    setState(resetMiniCrosswordGame(puzzle));
    setSelectedCell(initialEntry.cells[0]!);
    setActiveDirection(initialEntry.direction);
    setFeedback(null);
  }

  return {
    letters: state.letters,
    gameStatus: state.status,
    selectedCell,
    activeDirection,
    activeEntry,
    feedback,
    canCheckWord:
      state.status === "playing" &&
      activeEntry !== null &&
      isMiniCrosswordEntryFilled(puzzle, state, activeEntry),
    canSubmit:
      state.status === "playing" && isMiniCrosswordBoardFilled(puzzle, state),
    selectCell,
    selectEntry,
    enterLetter,
    backspace,
    clearWord,
    checkWord,
    submit,
    playAgain,
  };
}

function getEntriesForCell(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
): MiniCrosswordEntry[] {
  return puzzle.entries.filter((entry) =>
    entry.cells.some((entryCell) => cellsEqual(entryCell, cell)),
  );
}

function findActiveEntry(
  puzzle: MiniCrosswordPuzzle,
  cell: MiniCrosswordCell,
  direction: MiniCrosswordDirection,
): MiniCrosswordEntry | null {
  return (
    puzzle.entries.find(
      (entry) =>
        entry.direction === direction &&
        entry.cells.some((entryCell) => cellsEqual(entryCell, cell)),
    ) ?? null
  );
}

function cellsEqual(
  first: MiniCrosswordCell,
  second: MiniCrosswordCell,
): boolean {
  return first.row === second.row && first.column === second.column;
}
