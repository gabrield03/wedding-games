import "server-only";

import { getPrivilegedSupabaseClient } from "@/server/supabase/privileged";
import type { Tables } from "@/types/database.generated";

export type CurrentEvent = Pick<Tables<"events">, "id" | "slug">;

export async function getCurrentEvent(): Promise<CurrentEvent> {
  const slug = process.env.CURRENT_EVENT_SLUG?.trim();

  if (!slug) {
    throw new Error("CURRENT_EVENT_SLUG is not configured.");
  }

  const { data, error } = await getPrivilegedSupabaseClient()
    .from("events")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve configured Event "${slug}".`, {
      cause: error,
    });
  }

  if (!data) {
    throw new Error(`Configured Event "${slug}" does not exist.`);
  }

  return data;
}
