import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

let privilegedClient: ReturnType<typeof createPrivilegedClient> | undefined;

function createPrivilegedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getPrivilegedSupabaseClient() {
  privilegedClient ??= createPrivilegedClient();
  return privilegedClient;
}
