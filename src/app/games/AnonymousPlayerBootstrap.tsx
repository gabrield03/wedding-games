"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.generated";

let bootstrapInFlight: Promise<void> | null = null;

type AnonymousPlayerBootstrapStatus = "pending" | "ready" | "error";

type AnonymousPlayerBootstrapValue = {
  status: AnonymousPlayerBootstrapStatus;
  retry: () => void;
};

const AnonymousPlayerBootstrapContext =
  createContext<AnonymousPlayerBootstrapValue | null>(null);

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

export function AnonymousPlayerBootstrap({
  children,
}: {
  children?: ReactNode;
}) {
  const [status, setStatus] =
    useState<AnonymousPlayerBootstrapStatus>("pending");
  const runGeneration = useRef(0);

  const retry = useCallback(() => {
    const generation = ++runGeneration.current;
    setStatus("pending");

    void bootstrapAnonymousPlayer().then(
      () => {
        if (runGeneration.current === generation) {
          setStatus("ready");
        }
      },
      () => {
        if (runGeneration.current === generation) {
          setStatus("error");
        }
      },
    );
  }, []);

  useEffect(() => {
    const generation = ++runGeneration.current;

    void bootstrapAnonymousPlayer().then(
      () => {
        if (runGeneration.current === generation) {
          setStatus("ready");
        }
      },
      () => {
        if (runGeneration.current === generation) {
          setStatus("error");
        }
      },
    );

    return () => {
      runGeneration.current += 1;
    };
  }, []);

  const value = useMemo(() => ({ status, retry }), [retry, status]);

  return (
    <AnonymousPlayerBootstrapContext.Provider value={value}>
      {children}
    </AnonymousPlayerBootstrapContext.Provider>
  );
}

export function useAnonymousPlayerBootstrap() {
  const context = useContext(AnonymousPlayerBootstrapContext);

  if (!context) {
    throw new Error(
      "useAnonymousPlayerBootstrap must be used within AnonymousPlayerBootstrap.",
    );
  }

  return context;
}
