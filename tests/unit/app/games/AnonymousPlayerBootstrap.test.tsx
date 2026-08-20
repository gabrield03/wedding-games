import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const browserClientMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: browserClientMocks.getClient,
}));

import { AnonymousPlayerBootstrap } from "@/app/games/AnonymousPlayerBootstrap";

function response(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function mockBrowserClient({
  hasSession = true,
}: { hasSession?: boolean } = {}) {
  const getSession = vi.fn().mockResolvedValue({
    data: { session: hasSession ? { access_token: "session" } : null },
    error: null,
  });
  const refreshSession = vi.fn().mockResolvedValue({
    data: { session: { access_token: "refreshed-session" } },
    error: null,
  });
  const signInAnonymously = vi.fn().mockResolvedValue({
    data: { session: { access_token: "anonymous-session" } },
    error: null,
  });
  const signOut = vi.fn().mockResolvedValue({ error: null });

  browserClientMocks.getClient.mockReturnValue({
    auth: {
      getSession,
      refreshSession,
      signInAnonymously,
      signOut,
    },
  });

  return { getSession, refreshSession, signInAnonymously, signOut };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AnonymousPlayerBootstrap", () => {
  it("reuses an existing Auth session", async () => {
    const client = mockBrowserClient();
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal("fetch", fetchMock);

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(client.getSession).toHaveBeenCalledTimes(1);
    expect(client.signInAnonymously).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/player/bootstrap", {
      credentials: "same-origin",
      method: "POST",
    });
  });

  it("creates an anonymous Auth identity when no session exists", async () => {
    const client = mockBrowserClient({ hasSession: false });
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal("fetch", fetchMock);

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(client.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("shares concurrent work within one browser tab", async () => {
    const client = mockBrowserClient({ hasSession: false });
    let resolveBootstrap!: (value: Response) => void;
    const pendingBootstrap = new Promise<Response>((resolve) => {
      resolveBootstrap = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pendingBootstrap);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <>
        <AnonymousPlayerBootstrap />
        <AnonymousPlayerBootstrap />
      </>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(client.getSession).toHaveBeenCalledTimes(1);
    expect(client.signInAnonymously).toHaveBeenCalledTimes(1);

    resolveBootstrap(response(204));
    await pendingBootstrap;
  });

  it("performs one stale-session recovery and one bootstrap retry", async () => {
    const client = mockBrowserClient();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal("fetch", fetchMock);

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(client.refreshSession).toHaveBeenCalledTimes(1);
    expect(client.signOut).not.toHaveBeenCalled();
    expect(client.signInAnonymously).not.toHaveBeenCalled();
  });

  it("replaces an unrecoverable stale session before its one retry", async () => {
    const client = mockBrowserClient();
    client.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh failed" },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal("fetch", fetchMock);

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(client.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(client.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("does not loop when the bounded bootstrap retry is also unauthorized", async () => {
    const client = mockBrowserClient();
    const fetchMock = vi.fn().mockResolvedValue(response(401));
    vi.stubGlobal("fetch", fetchMock);

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("clears failed in-flight work so a later mount can retry", async () => {
    mockBrowserClient();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal("fetch", fetchMock);

    const firstRender = render(<AnonymousPlayerBootstrap />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    firstRender.unmount();

    render(<AnonymousPlayerBootstrap />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
