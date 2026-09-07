"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MINI_CROSSWORD_PUZZLE_IDS } from "@/content/miniCrossword/puzzleIds";

import { loadLastVisitedMiniCrosswordPuzzleId } from "./miniCrosswordProgressStorage";

export function MiniCrosswordEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const puzzleId =
      loadLastVisitedMiniCrosswordPuzzleId() ?? MINI_CROSSWORD_PUZZLE_IDS[0];
    router.replace(`/games/mini-crossword/${puzzleId}`);
  }, [router]);

  return (
    <section
      className="w-full min-w-0"
      aria-labelledby="mini-crossword-entry-heading"
    >
      <h1
        id="mini-crossword-entry-heading"
        className="text-center text-3xl font-bold"
      >
        Mini Crossword
      </h1>
      <p className="mt-6 text-center text-neutral-600" role="status">
        Loading puzzle...
      </p>
    </section>
  );
}
