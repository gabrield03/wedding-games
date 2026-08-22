import { createRequestSupabaseClient } from "@/lib/supabase/server";
import {
  measureLatencyStage,
  setLatencyOutcome,
  withLatencyDiagnostic,
} from "@/server/diagnostics/latency";
import { getCurrentEvent } from "@/server/events/getCurrentEvent";
import { ensureCurrentPlayer } from "@/server/players/ensureCurrentPlayer";

export async function POST(request?: Request) {
  return withLatencyDiagnostic("player_bootstrap", request, async () => {
    try {
      const supabase = await createRequestSupabaseClient();
      const { data, error } = await measureLatencyStage("claims", () =>
        supabase.auth.getClaims(),
      );
      const authUserId = data?.claims?.sub;

      if (error || typeof authUserId !== "string" || !authUserId) {
        setLatencyOutcome("unauthenticated");
        return Response.json(
          { error: "An authenticated player session is required." },
          { status: 401 },
        );
      }

      const event = await measureLatencyStage("currentEvent", () =>
        getCurrentEvent(),
      );
      await measureLatencyStage("ensurePlayer", () =>
        ensureCurrentPlayer({
          authUserId,
          eventId: event.id,
        }),
      );

      setLatencyOutcome("ready");
      return new Response(null, { status: 204 });
    } catch {
      setLatencyOutcome("unavailable");
      console.error("Player bootstrap failed.");

      return Response.json(
        { error: "Player session setup is temporarily unavailable." },
        { status: 503 },
      );
    }
  });
}
