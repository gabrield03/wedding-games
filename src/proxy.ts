import { NextResponse, type NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import { logStandaloneLatency } from "@/server/diagnostics/latency";

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();

  try {
    const response = await refreshSupabaseSession(request);

    logStandaloneLatency({
      operation: "proxy_session_refresh",
      outcome: "ready",
      request,
      totalMs: performance.now() - startedAt,
    });

    return response;
  } catch {
    // Identity bootstrap is transitional; session refresh must not block games.
    logStandaloneLatency({
      operation: "proxy_session_refresh",
      outcome: "continued_after_error",
      request,
      totalMs: performance.now() - startedAt,
    });

    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/games/:path*",
    "/api/player/bootstrap",
    "/api/games/connections/:path*",
    "/api/games/wordle/:path*",
  ],
};
