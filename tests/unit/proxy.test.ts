import { afterEach, describe, expect, it, vi } from "vitest";

const proxyMocks = vi.hoisted(() => ({
  fallbackResponse: { source: "fallback" },
  next: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: proxyMocks.next,
  },
}));
vi.mock("@/lib/supabase/proxy", () => ({
  refreshSupabaseSession: proxyMocks.refreshSession,
}));

import { config, proxy } from "@/proxy";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Next.js Proxy", () => {
  it("is restricted to game and Player-bootstrap routes", () => {
    expect(config.matcher).toEqual([
      "/games/:path*",
      "/api/player/bootstrap",
      "/api/games/connections/:path*",
      "/api/games/wordle/:path*",
    ]);
  });

  it("returns the refreshed-session response", async () => {
    const request = { cookies: {} };
    const refreshedResponse = { source: "refreshed" };
    proxyMocks.refreshSession.mockResolvedValue(refreshedResponse);

    await expect(proxy(request as never)).resolves.toBe(refreshedResponse);
    expect(proxyMocks.next).not.toHaveBeenCalled();
  });

  it("does not block games when transitional session refresh fails", async () => {
    const request = { cookies: {} };
    proxyMocks.refreshSession.mockRejectedValue(new Error("unavailable"));
    proxyMocks.next.mockReturnValue(proxyMocks.fallbackResponse);

    await expect(proxy(request as never)).resolves.toBe(
      proxyMocks.fallbackResponse,
    );
    expect(proxyMocks.next).toHaveBeenCalledWith({ request });
  });
});
