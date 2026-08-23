"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { StrandsAnswer, StrandsPuzzle } from "@/domain/strands/types";

type StrandsGridProps = {
  puzzle: StrandsPuzzle;
  selectedPath: number[];
  foundWords: string[];
  disabled: boolean;
  onSelectTile: (tileIndex: number) => void;
};

type FoundAnswerVisual = {
  answer: StrandsAnswer;
  tileClass: string;
  lineClass: string;
};

type PointerGesture = {
  pointerId: number;
  startTileIndex: number;
  startX: number;
  startY: number;
  dragged: boolean;
  lastTileIndex: number;
};

const DRAG_DISTANCE_PX = 6;

const THEME_VISUALS = [
  {
    tileClass: "border-rose-700 bg-rose-700 text-white",
    lineClass: "stroke-rose-700",
  },
  {
    tileClass: "border-amber-600 bg-amber-600 text-white",
    lineClass: "stroke-amber-600",
  },
  {
    tileClass: "border-emerald-700 bg-emerald-700 text-white",
    lineClass: "stroke-emerald-700",
  },
  {
    tileClass: "border-cyan-700 bg-cyan-700 text-white",
    lineClass: "stroke-cyan-700",
  },
  {
    tileClass: "border-indigo-700 bg-indigo-700 text-white",
    lineClass: "stroke-indigo-700",
  },
  {
    tileClass: "border-fuchsia-700 bg-fuchsia-700 text-white",
    lineClass: "stroke-fuchsia-700",
  },
] as const;

const SPANGRAM_VISUAL = {
  tileClass:
    "border-violet-700 bg-violet-700 text-white ring-2 ring-violet-300",
  lineClass: "stroke-violet-700",
} as const;

export function StrandsGrid({
  puzzle,
  selectedPath,
  foundWords,
  disabled,
  onSelectTile,
}: StrandsGridProps) {
  const selectedTiles = new Set(selectedPath);
  const foundAnswers = getFoundAnswerVisuals(puzzle, foundWords);
  const foundTileVisuals = new Map<number, FoundAnswerVisual>();
  const gestureRef = useRef<PointerGesture | null>(null);
  const selectedPathRef = useRef(selectedPath);
  selectedPathRef.current = selectedPath;

  for (const visual of foundAnswers) {
    for (const tileIndex of visual.answer.path) {
      foundTileVisuals.set(tileIndex, visual);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    const tile = getTileElement(event.target);
    const tileIndex = getInteractiveTileIndex(tile);

    if (tileIndex === null) {
      return;
    }

    gestureRef.current = {
      pointerId: event.pointerId,
      startTileIndex: tileIndex,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
      lastTileIndex: tileIndex,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const hoveredTile = getTileElementFromPoint(event.clientX, event.clientY);
    const hoveredTileIndex = getInteractiveTileIndex(hoveredTile);
    const movedFarEnough =
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >=
      DRAG_DISTANCE_PX;
    const movedToAnotherTile =
      hoveredTileIndex !== null && hoveredTileIndex !== gesture.startTileIndex;

    if (!gesture.dragged && !movedFarEnough && !movedToAnotherTile) {
      return;
    }

    if (!gesture.dragged) {
      gesture.dragged = true;

      const currentFinalTile = selectedPathRef.current.at(-1);

      if (currentFinalTile !== gesture.startTileIndex) {
        onSelectTile(gesture.startTileIndex);
      }
    }

    if (
      hoveredTileIndex === null ||
      hoveredTileIndex === gesture.lastTileIndex
    ) {
      return;
    }

    gesture.lastTileIndex = hoveredTileIndex;
    onSelectTile(hoveredTileIndex);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (!gesture.dragged) {
      onSelectTile(gesture.startTileIndex);
    }

    finishPointerGesture(event);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (gestureRef.current?.pointerId !== event.pointerId) {
      return;
    }

    finishPointerGesture(event);
  }

  function finishPointerGesture(event: ReactPointerEvent<HTMLDivElement>) {
    gestureRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className="relative mx-auto w-64 max-w-[calc(100vw-2rem)] sm:w-80"
      data-strands-board
    >
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${puzzle.grid.columns} ${puzzle.grid.rows}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {foundAnswers.map((visual) => (
          <polyline
            key={visual.answer.word}
            points={pathPoints(visual.answer.path, puzzle.grid.columns)}
            fill="none"
            className={visual.lineClass}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {selectedPath.length > 1 && (
          <polyline
            points={pathPoints(selectedPath, puzzle.grid.columns)}
            fill="none"
            className="stroke-sky-500"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div
        className="relative z-10 grid touch-none select-none grid-cols-6 gap-2 sm:gap-3"
        role="grid"
        aria-label="Strands letter grid"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {Array.from(puzzle.grid.letters).map((letter, tileIndex) => {
          const selected = selectedTiles.has(tileIndex);
          const foundVisual = foundTileVisuals.get(tileIndex);
          const row = Math.floor(tileIndex / puzzle.grid.columns) + 1;
          const column = (tileIndex % puzzle.grid.columns) + 1;
          const foundLabel = foundVisual
            ? `, found in ${foundVisual.answer.word}`
            : "";

          return (
            <button
              key={tileIndex}
              type="button"
              role="gridcell"
              aria-label={`${letter}, row ${row}, column ${column}${foundLabel}${selected ? ", selected" : ""}`}
              aria-pressed={selected}
              aria-disabled={Boolean(foundVisual) || disabled}
              data-strands-tile={tileIndex}
              data-strands-claimed={foundVisual ? "true" : "false"}
              onClick={(event) => {
                if (event.detail === 0 && !foundVisual && !disabled) {
                  onSelectTile(tileIndex);
                }
              }}
              className={`flex aspect-square min-w-0 items-center justify-center rounded-full border text-xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 sm:text-2xl ${
                foundVisual
                  ? foundVisual.tileClass
                  : selected
                    ? "border-sky-600 bg-sky-600 text-white ring-2 ring-sky-200"
                    : "border-neutral-300 bg-background text-foreground hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              } ${foundVisual || disabled ? "cursor-default" : "cursor-pointer active:scale-95"}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getFoundAnswerVisuals(
  puzzle: StrandsPuzzle,
  foundWords: string[],
): FoundAnswerVisual[] {
  const found = new Set(foundWords);
  const visuals: FoundAnswerVisual[] = [];

  puzzle.themeWords.forEach((answer, index) => {
    if (!found.has(answer.word)) {
      return;
    }

    const visual = THEME_VISUALS[index % THEME_VISUALS.length]!;
    visuals.push({ answer, ...visual });
  });

  if (found.has(puzzle.spangram.word)) {
    visuals.push({ answer: puzzle.spangram, ...SPANGRAM_VISUAL });
  }

  return visuals;
}

function pathPoints(path: number[], columns: number): string {
  return path
    .map((tileIndex) => {
      const row = Math.floor(tileIndex / columns);
      const column = tileIndex % columns;
      return `${column + 0.5},${row + 0.5}`;
    })
    .join(" ");
}

function getTileElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-strands-tile]")
    : null;
}

function getTileElementFromPoint(clientX: number, clientY: number) {
  return getTileElement(document.elementFromPoint(clientX, clientY));
}

function getInteractiveTileIndex(tile: HTMLElement | null): number | null {
  if (!tile || tile.dataset.strandsClaimed === "true") {
    return null;
  }

  const tileIndex = Number(tile.dataset.strandsTile);
  return Number.isInteger(tileIndex) ? tileIndex : null;
}
