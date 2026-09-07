import { GamePageShell } from "@/components/GamePageShell";
import { MiniCrosswordEntryRedirect } from "@/features/miniCrossword/MiniCrosswordEntryRedirect";

export default function MiniCrosswordEntryPage() {
  return (
    <GamePageShell>
      <MiniCrosswordEntryRedirect />
    </GamePageShell>
  );
}
