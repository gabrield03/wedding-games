import { createRequestSupabaseClient } from "@/lib/supabase/server";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { ensureCurrentPlayer } from "@/server/players/ensureCurrentPlayer";

export async function POST() {
  try {
    const supabase = await createRequestSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    const authUserId = data?.claims?.sub;

    if (error || typeof authUserId !== "string" || !authUserId) {
      return Response.json(
        { error: "An authenticated player session is required." },
        { status: 401 },
      );
    }

    const event = await getCurrentEvent();
    await ensureCurrentPlayer({
      authUserId,
      eventId: event.id,
    });

    return new Response(null, { status: 204 });
  } catch {
    console.error("Player bootstrap failed.");

    return Response.json(
      { error: "Player session setup is temporarily unavailable." },
      { status: 503 },
    );
  }
}
