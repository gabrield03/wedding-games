import "server-only";

import { createRequestSupabaseClient } from "@/lib/supabase/server";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { measureLatencyStage } from "@/server/diagnostics/latency";
import type { Tables } from "@/types/database.generated";

export type CurrentPlayer = {
  eventId: Tables<"players">["event_id"];
  id: Tables<"players">["id"];
};

export type CurrentPlayerResolution =
  | { status: "resolved"; player: CurrentPlayer }
  | { status: "unauthenticated" }
  | { status: "player_missing" };

export async function getCurrentPlayer(): Promise<CurrentPlayerResolution> {
  return measureLatencyStage("currentPlayer", async () => {
    const supabase = await createRequestSupabaseClient();

    let claimsResult: Awaited<
      ReturnType<typeof supabase.auth.getClaims>
    > | null;

    try {
      claimsResult = await measureLatencyStage("claims", () =>
        supabase.auth.getClaims(),
      );
    } catch {
      claimsResult = null;
    }

    const authUserId = claimsResult?.data?.claims?.sub;

    if (
      !claimsResult ||
      claimsResult.error ||
      typeof authUserId !== "string" ||
      !authUserId
    ) {
      return { status: "unauthenticated" };
    }

    const event = await measureLatencyStage("currentEvent", () =>
      getCurrentEvent(),
    );
    const { data, error } = await measureLatencyStage("playerLookup", () =>
      supabase
        .from("players")
        .select("id, event_id")
        .eq("event_id", event.id)
        .eq("auth_user_id", authUserId)
        .maybeSingle(),
    );

    if (error) {
      throw new Error("Failed to resolve the current Player.");
    }

    if (!data) {
      return { status: "player_missing" };
    }

    return {
      status: "resolved",
      player: {
        eventId: data.event_id,
        id: data.id,
      },
    };
  });
}
