"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { STRANDS_PUZZLE_IDS } from "@/content/strands/puzzleIds";

import { loadLastVisitedStrandsPuzzleId } from "./strandsProgressStorage";

export function StrandsEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const puzzleId = loadLastVisitedStrandsPuzzleId() ?? STRANDS_PUZZLE_IDS[0];
    router.replace(`/games/strands/${puzzleId}`);
  }, [router]);

  return (
    <section className="w-full min-w-0" aria-labelledby="strands-entry-heading">
      <h1 id="strands-entry-heading" className="text-center text-3xl font-bold">
        Strands
      </h1>
      <p className="mt-6 text-center text-neutral-600" role="status">
        Loading puzzle...
      </p>
    </section>
  );
}
