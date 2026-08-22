import "server-only";

import { createRequestSupabaseClient } from "@/lib/supabase/server";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
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
  const supabase = await createRequestSupabaseClient();

  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>> | null;

  try {
    claimsResult = await supabase.auth.getClaims();
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

  const event = await getCurrentEvent();
  const { data, error } = await supabase
    .from("players")
    .select("id, event_id")
    .eq("event_id", event.id)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

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
}
