import type { ConnectionTile as ConnectionTileModel } from "@/domain/connections/types";

type ConnectionTileProps = {
  tile: ConnectionTileModel;
  selected: boolean;
  onToggle: (tileId: string) => void;
};

export function ConnectionTile({
  tile,
  selected,
  onToggle,
}: ConnectionTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(tile.id)}
      className={`min-h-20 cursor-pointer rounded-lg border px-3 py-4 font-semibold transition ${
        selected
          ? "bg-neutral-800 text-white"
          : "bg-neutral-100 text-neutral-900"
      }`}
    >
      {tile.label}
    </button>
  );
}
