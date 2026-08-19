import { NextResponse, type NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  try {
    return await refreshSupabaseSession(request);
  } catch {
    // Identity bootstrap is transitional; session refresh must not block games.
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/games/:path*", "/api/player/bootstrap"],
};
