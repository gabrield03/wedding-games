import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/supabase/environment";
import type { Database } from "@/types/database.generated";

export async function createRequestSupabaseClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabasePublicConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, options, value } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Proxy refreshes the session.
        }
      },
    },
  });
}
