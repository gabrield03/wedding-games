"use client";

import { useState } from "react";

import type { ConnectionsPuzzle } from "@/domain/connections/types";

import { ConnectionTile } from "./ConnectionTile";

const MAX_SELECTED_TILES = 4;

type ConnectionsGameBoardProps = {
  puzzle: ConnectionsPuzzle;
};

export function ConnectionsGameBoard({ puzzle }: ConnectionsGameBoardProps) {
  const tiles = puzzle.groups.flatMap((group) => group.tiles);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [tileOrder, setTileOrder] = useState<string[]>(
    tiles.map((tile) => tile.id),
  );

  function handleTileToggle(tileId: string) {
    setSelectedTileIds((currentTileIds) => {
      if (currentTileIds.includes(tileId)) {
        return currentTileIds.filter((id) => id !== tileId);
      }

      if (currentTileIds.length >= MAX_SELECTED_TILES) {
        return currentTileIds;
      }

      return [...currentTileIds, tileId];
    });
  }

  function handleShuffle() {
    setTileOrder((currentOrder) => shuffle(currentOrder));
  }

  const orderedTiles = tileOrder.map((tileId) => {
    const tile = tiles.find((candidate) => candidate.id === tileId);

    if (!tile) {
      throw new Error(`Tile not found: ${tileId}`);
    }

    return tile;
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <section>
        <h1 className="text-center text-3xl font-bold">{puzzle.title}</h1>

        <p className="mt-2 text-center text-neutral-600">
          Find groups of four related items.
        </p>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {orderedTiles.map((tile) => {
            const selected = selectedTileIds.includes(tile.id);

            return (
              <ConnectionTile
                key={tile.id}
                tile={tile}
                selected={selected}
                onToggle={handleTileToggle}
              />
            );
          })}
        </div>

        <p className="mt-6 text-center">
          {selectedTileIds.length} / {MAX_SELECTED_TILES} selected
        </p>

        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={handleShuffle}
            className="cursor-pointer rounded-full border px-5 py-2 font-semibold"
          >
            Shuffle
          </button>

          <button
            type="button"
            disabled={selectedTileIds.length !== MAX_SELECTED_TILES}
            className="rounded-full border px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      </section>
    </main>
  );
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
