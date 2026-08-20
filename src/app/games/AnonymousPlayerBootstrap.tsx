"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.generated";

let bootstrapInFlight: Promise<void> | null = null;

async function ensureAnonymousSession(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (data.session) {
    return;
  }

  const { error: signInError } = await client.auth.signInAnonymously();

  if (signInError) {
    throw signInError;
  }
}

async function recoverStaleSession(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.refreshSession();

  if (!error && data.session) {
    return;
  }

  const { error: signOutError } = await client.auth.signOut({ scope: "local" });

  if (signOutError) {
    throw signOutError;
  }

  const { error: signInError } = await client.auth.signInAnonymously();

  if (signInError) {
    throw signInError;
  }
}

async function requestPlayerBootstrap() {
  return fetch("/api/player/bootstrap", {
    credentials: "same-origin",
    method: "POST",
  });
}

async function performBootstrap() {
  const client = getSupabaseBrowserClient();
  await ensureAnonymousSession(client);

  let response = await requestPlayerBootstrap();

  if (response.status === 401) {
    await recoverStaleSession(client);
    response = await requestPlayerBootstrap();
  }

  if (!response.ok) {
    throw new Error(`Player bootstrap failed with status ${response.status}.`);
  }
}

function bootstrapAnonymousPlayer() {
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }

  const currentBootstrap = performBootstrap();
  bootstrapInFlight = currentBootstrap;

  currentBootstrap.then(
    () => {
      if (bootstrapInFlight === currentBootstrap) {
        bootstrapInFlight = null;
      }
    },
    () => {
      if (bootstrapInFlight === currentBootstrap) {
        bootstrapInFlight = null;
      }
    },
  );

  return currentBootstrap;
}

export function AnonymousPlayerBootstrap() {
  useEffect(() => {
    void bootstrapAnonymousPlayer().catch(() => undefined);
  }, []);

  return null;
}
