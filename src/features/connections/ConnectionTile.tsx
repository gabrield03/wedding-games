import type { ConnectionTile as ConnectionTileModel } from "@/domain/connections/types";

type ConnectionTileProps = {
  tile: ConnectionTileModel;
  selected: boolean;
  shaking: boolean;
  correct: boolean;
  onToggle: (tileId: string) => void;
};

export function ConnectionTile({
  tile,
  selected,
  shaking,
  correct,
  onToggle,
}: ConnectionTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(tile.id)}
      className={`min-h-16 min-w-0 cursor-pointer rounded-lg border px-1 py-3 text-xs font-semibold break-words transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 active:scale-[0.98] sm:min-h-20 sm:px-3 sm:py-4 sm:text-base ${
        selected
          ? "bg-neutral-800 text-white"
          : "bg-neutral-100 text-neutral-900"
      } ${shaking ? "tile-shake" : ""} ${correct ? "tile-correct" : ""}`}
    >
      {tile.label}
    </button>
  );
}
