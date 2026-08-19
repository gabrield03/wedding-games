import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSecretKey = process.env.SUPABASE_SECRET_KEY;

beforeEach(() => {
  vi.resetModules();
  supabaseMocks.createClient.mockReturnValue({ source: "privileged-client" });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret-key";
});

afterEach(() => {
  vi.clearAllMocks();

  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalSecretKey === undefined) {
    delete process.env.SUPABASE_SECRET_KEY;
  } else {
    process.env.SUPABASE_SECRET_KEY = originalSecretKey;
  }
});

describe("getPrivilegedSupabaseClient", () => {
  it("uses the plain secret-key client without browser session behavior", async () => {
    const { getPrivilegedSupabaseClient } =
      await import("@/server/supabase/privileged");

    const first = getPrivilegedSupabaseClient();
    const second = getPrivilegedSupabaseClient();

    expect(first).toBe(second);
    expect(supabaseMocks.createClient).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-secret-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });

  it("fails clearly without the server-only secret", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    const { getPrivilegedSupabaseClient } =
      await import("@/server/supabase/privileged");

    expect(() => getPrivilegedSupabaseClient()).toThrow(
      "SUPABASE_SECRET_KEY is not configured.",
    );
    expect(supabaseMocks.createClient).not.toHaveBeenCalled();
  });
});
