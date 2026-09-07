"use client";

import { useMemo, useState } from "react";

import {
  clearMiniCrosswordCell,
  createInitialMiniCrosswordGameState,
  isMiniCrosswordBoardFilled,
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

type MiniCrosswordFeedback = "incorrect" | "complete" | null;

export function useMiniCrosswordGame(puzzle: MiniCrosswordPuzzle) {
  const initialEntry = puzzle.entries[0]!;
  const [state, setState] = useState(() =>
    createInitialMiniCrosswordGameState(puzzle),
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

    if (
      entry &&
      selectedIndex !== undefined &&
      selectedIndex >= 0 &&
      selectedIndex < entry.cells.length - 1
    ) {
      setSelectedCell(entry.cells[selectedIndex + 1]!);
    }
  }

  function backspace() {
    if (state.status === "complete") {
      return;
    }

    setState((current) =>
      clearMiniCrosswordCell(puzzle, current, selectedCell),
    );
    setFeedback(null);

    const entry = findActiveEntry(puzzle, selectedCell, activeDirection);
    const selectedIndex = entry?.cells.findIndex((cell) =>
      cellsEqual(cell, selectedCell),
    );

    if (entry && selectedIndex !== undefined && selectedIndex > 0) {
      setSelectedCell(entry.cells[selectedIndex - 1]!);
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
    canSubmit:
      state.status === "playing" &&
      isMiniCrosswordBoardFilled(puzzle, state),
    selectCell,
    selectEntry,
    enterLetter,
    backspace,
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
