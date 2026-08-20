import "server-only";

import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

export type CurrentPlayer = Pick<
  Tables<"players">,
  "auth_user_id" | "event_id" | "id"
>;

type EnsureCurrentPlayerInput = {
  authUserId: string;
  eventId: string;
};

export async function ensureCurrentPlayer({
  authUserId,
  eventId,
}: EnsureCurrentPlayerInput): Promise<CurrentPlayer> {
  const supabase = getPrivilegedSupabaseClient();
  const { error: insertError } = await supabase.from("players").upsert(
    {
      auth_user_id: authUserId,
      event_id: eventId,
    },
    {
      ignoreDuplicates: true,
      onConflict: "event_id,auth_user_id",
    },
  );

  if (insertError) {
    throw new Error("Failed to create the current Player.", {
      cause: insertError,
    });
  }

  const { data, error: selectError } = await supabase
    .from("players")
    .select("id, event_id, auth_user_id")
    .eq("event_id", eventId)
    .eq("auth_user_id", authUserId)
    .single();

  if (selectError) {
    throw new Error("Failed to resolve the current Player.", {
      cause: selectError,
    });
  }

  return data;
}
