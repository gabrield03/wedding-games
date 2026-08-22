import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ConnectionsAttemptSnapshot,
  ConnectionsPuzzlePreview,
} from "@/contracts/connections";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";
import { testConnectionsPuzzle } from "../../../fixtures/connections";

const controllerMocks = vi.hoisted(() => ({
  bootstrapRetry: vi.fn(),
  bootstrapStatus: "ready" as "pending" | "ready" | "error",
  requestAttempt: vi.fn(),
  requestGuess: vi.fn(),
}));

vi.mock("@/app/games/AnonymousPlayerBootstrap", () => ({
  useAnonymousPlayerBootstrap: () => ({
    status: controllerMocks.bootstrapStatus,
    retry: controllerMocks.bootstrapRetry,
  }),
}));
vi.mock("@/features/connections/connectionsApiClient", () => ({
  requestConnectionsAttempt: controllerMocks.requestAttempt,
  requestConnectionsGuess: controllerMocks.requestGuess,
}));

const puzzle: ConnectionsPuzzlePreview = {
  id: testConnectionsPuzzle.id,
  title: testConnectionsPuzzle.title,
};
const initialAttemptId = "60000000-0000-4000-8000-000000000001";

beforeEach(() => {
  controllerMocks.bootstrapRetry.mockReset();
  controllerMocks.requestAttempt.mockReset();
  controllerMocks.requestGuess.mockReset();
  controllerMocks.bootstrapStatus = "ready";
  controllerMocks.requestAttempt.mockResolvedValue({
    status: "ready",
    attempt: snapshot(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ConnectionsGameBoard", () => {
  it("always renders public page content while waiting for Player readiness", () => {
    controllerMocks.bootstrapStatus = "pending";

    render(<ConnectionsGameBoard puzzle={puzzle} />);

    expect(screen.getByRole("heading", { name: puzzle.title })).toBeTruthy();
    expect(screen.getByText("Preparing your game…")).toBeTruthy();
    expect(controllerMocks.requestAttempt).not.toHaveBeenCalled();
  });

  it("shows bootstrap errors and exposes only a retry action", () => {
    controllerMocks.bootstrapStatus = "error";

    render(<ConnectionsGameBoard puzzle={puzzle} />);

    expect(
      screen.getByText("We couldn’t prepare your player session."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(controllerMocks.bootstrapRetry).toHaveBeenCalledTimes(1);
    expect(controllerMocks.requestAttempt).not.toHaveBeenCalled();
  });

  it("initializes from a sanitized server Attempt after bootstrap readiness", async () => {
    await renderReadyGame();

    expect(controllerMocks.requestAttempt).toHaveBeenCalledWith({
      puzzleId: puzzle.id,
    });
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(16);
    expect(screen.getByText("Mistakes remaining: 4")).toBeTruthy();
  });

  it("keeps player_not_ready retryable without local gameplay", async () => {
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "error",
      error: "player_not_ready",
    });

    render(<ConnectionsGameBoard puzzle={puzzle} />);

    expect(
      await screen.findByText(
        "Your player session isn’t ready yet. Try preparing it again.",
      ),
    ).toBeTruthy();
    expect(screen.queryAllByRole("button", { pressed: false })).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(controllerMocks.bootstrapRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a resumed completed Attempt and its terminal reaction", async () => {
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({
        solvedGroups: [0, 1, 2, 3],
        status: "won",
        version: 4,
      }),
    });

    render(<ConnectionsGameBoard puzzle={puzzle} />);

    expect(await screen.findByText("Puzzle complete!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(getReaction("win")).toBeTruthy();
  });

  it("preserves selection semantics, the four-tile cap, and manual shuffle", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    await renderReadyGame();
    const labels = testConnectionsPuzzle.groups
      .flatMap((group) => group.tiles)
      .slice(0, 5)
      .map((tile) => tile.label);

    for (const label of labels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    expect(screen.getByText("4 / 4 selected")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: labels[4] })
        .getAttribute("aria-pressed"),
    ).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    for (const label of labels.slice(0, 4)) {
      expect(
        screen
          .getByRole("button", { name: label })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    }
  });

  it("submits only opaque tokens and the authoritative version", async () => {
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      outcome: "incorrect",
      attempt: snapshot({ mistakes: 1, version: 1 }),
    });
    await renderReadyGame(snapshot({ version: 0 }));
    const labels = mixedWrongLabels();

    await submitLabels(labels);

    const expectedTokens = labels.map(tokenForLabel);
    expect(controllerMocks.requestGuess).toHaveBeenCalledWith(
      initialAttemptId,
      {
        tileIds: expectedTokens,
        version: 0,
      },
    );
    expect(expectedTokens.every((value) => isUuid(value))).toBe(true);
  });

  it("applies incorrect and one-away snapshots immediately while preserving selection", async () => {
    controllerMocks.requestGuess
      .mockResolvedValueOnce({
        status: "submitted",
        outcome: "incorrect",
        attempt: snapshot({ mistakes: 1, version: 1 }),
      })
      .mockResolvedValueOnce({
        status: "submitted",
        outcome: "one_away",
        attempt: snapshot({ mistakes: 2, version: 2 }),
      });
    await renderReadyGame();
    const wrongLabels = mixedWrongLabels();

    await submitLabels(wrongLabels);

    expect(screen.getByText("Incorrect guess")).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 3")).toBeTruthy();
    expectSelected(wrongLabels);
    expect(getReaction("incorrect")).toBeTruthy();

    clearSelection(wrongLabels);
    const oneAwayLabels = [label(0, 0), label(0, 1), label(0, 2), label(1, 0)];
    await submitLabels(oneAwayLabels);

    expect(screen.getByText("One away!")).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 2")).toBeTruthy();
    expectSelected(oneAwayLabels);
  });

  it("synchronizes duplicate responses without mutation or a reaction", async () => {
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      outcome: "duplicate",
      attempt: snapshot({ mistakes: 1, version: 1 }),
    });
    await renderReadyGame(snapshot({ mistakes: 1, version: 1 }));
    const labels = mixedWrongLabels();

    await submitLabels(labels);

    expect(screen.getByText("Already guessed")).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 3")).toBeTruthy();
    expectSelected(labels);
    expect(getReaction("incorrect")).toBeNull();
  });

  it("delays installation of a correct authoritative snapshot for 300ms", async () => {
    vi.useFakeTimers();
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      outcome: "correct",
      attempt: snapshot({ solvedGroups: [0], version: 1 }),
    });
    await renderReadyGameWithTimers();
    const solvedLabels = groupLabels(0);

    await submitLabels(solvedLabels);

    expect(screen.getByText("Correct!")).toBeTruthy();
    expect(
      screen.queryByText(testConnectionsPuzzle.groups[0]!.category),
    ).toBeNull();
    expect(getReaction("correct")).toBeTruthy();

    for (const tileLabel of solvedLabels) {
      expect(
        screen.getByRole("button", { name: tileLabel }).className,
      ).toContain("tile-correct");
    }

    act(() => vi.advanceTimersByTime(299));
    expect(
      screen.queryByText(testConnectionsPuzzle.groups[0]!.category),
    ).toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByText(testConnectionsPuzzle.groups[0]!.category),
    ).toBeTruthy();
    expect(screen.queryByText("Correct!")).toBeNull();
  });

  it("shows authoritative final win and loss snapshots with persistent reactions", async () => {
    vi.useFakeTimers();
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({ solvedGroups: [0, 1, 2], version: 3 }),
    });
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      outcome: "correct",
      attempt: snapshot({
        solvedGroups: [0, 1, 2, 3],
        status: "won",
        version: 4,
      }),
    });
    await renderReadyGameWithTimers();

    await submitLabels(groupLabels(3));
    act(() => vi.advanceTimersByTime(300));

    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(getReaction("win")).toBeTruthy();

    cleanup();
    vi.useRealTimers();
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({ mistakes: 3, version: 3 }),
    });
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      outcome: "incorrect",
      attempt: snapshot({ mistakes: 4, status: "lost", version: 4 }),
    });
    await renderReadyGame();
    await submitLabels(mixedWrongLabels());

    expect(screen.getByText("Game over")).toBeTruthy();
    expect(getReaction("loss")).toBeTruthy();
    for (const group of testConnectionsPuzzle.groups) {
      expect(screen.getByText(group.category)).toBeTruthy();
    }
  });

  it("reconciles stale snapshots without fabricating an outcome or reaction", async () => {
    controllerMocks.requestGuess.mockResolvedValue({
      status: "error",
      error: "stale_attempt",
      attempt: snapshot({ solvedGroups: [0], version: 1 }),
    });
    await renderReadyGame();

    await submitLabels(groupLabels(0));

    expect(
      screen.getByText(
        "Your game was updated. Review your selection and try again.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(testConnectionsPuzzle.groups[0]!.category),
    ).toBeTruthy();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(getReaction("correct")).toBeNull();
    expect(getReaction("incorrect")).toBeNull();
  });

  it("retains the last snapshot and selection after a request failure", async () => {
    controllerMocks.requestGuess.mockRejectedValue(new Error("offline"));
    await renderReadyGame();
    const labels = mixedWrongLabels();

    await submitLabels(labels);

    expect(
      screen.getByText(
        "We couldn’t submit that guess. Your selection is still here; try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 4")).toBeTruthy();
    expectSelected(labels);
  });

  it("keeps the completed game visible until authoritative replay succeeds", async () => {
    const completed = snapshot({
      solvedGroups: [0, 1, 2, 3],
      status: "won",
      version: 4,
    });
    const replay =
      deferred<Awaited<ReturnType<typeof controllerMocks.requestAttempt>>>();
    await renderReadyGame(completed);
    controllerMocks.requestAttempt.mockReturnValueOnce(replay.promise);

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(getReaction("win")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Starting…" })).toBeTruthy();

    replay.resolve({
      status: "ready",
      attempt: snapshot({ attemptId: "60000000-0000-4000-8000-000000000002" }),
    });
    await act(async () => replay.promise);

    expect(screen.queryByText("Puzzle complete!")).toBeNull();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(16);
    expect(getReaction("win")).toBeNull();
    expect(controllerMocks.requestAttempt).toHaveBeenLastCalledWith({
      puzzleId: puzzle.id,
      replayFromAttemptId: completed.attemptId,
    });
  });

  it("preserves terminal state and reaction history when replay fails", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const completed = snapshot({ solvedGroups: [0, 1, 2, 3], status: "won" });
    await renderReadyGame(completed);
    controllerMocks.requestAttempt.mockRejectedValueOnce(new Error("offline"));
    const reactionSrc = getReactionSrc("win");

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(
      await screen.findByText(
        "We couldn’t start another game. Your completed game is still here; try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(getReactionSrc("win")).toBe(reactionSrc);
    expect(screen.getByRole("button", { name: "Play Again" })).toBeTruthy();
  });

  it("rotates reaction history exactly once after a successful replay", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const completed = snapshot({ solvedGroups: [0, 1, 2, 3], status: "won" });
    controllerMocks.requestAttempt
      .mockResolvedValueOnce({ status: "ready", attempt: completed })
      .mockResolvedValueOnce({
        status: "ready",
        attempt: snapshot({
          attemptId: "60000000-0000-4000-8000-000000000002",
        }),
      });
    await renderReadyGameWithTimers();
    const firstWin = getReactionSrc("win");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
      await Promise.resolve();
    });

    for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
      controllerMocks.requestGuess.mockResolvedValueOnce({
        status: "submitted",
        outcome: "correct",
        attempt: snapshot({
          attemptId: "60000000-0000-4000-8000-000000000002",
          solvedGroups: Array.from(
            { length: groupIndex + 1 },
            (_, index) => index,
          ),
          status: groupIndex === 3 ? "won" : "playing",
          version: groupIndex + 1,
        }),
      });
      await submitLabels(groupLabels(groupIndex));
      act(() => vi.advanceTimersByTime(300));
    }

    expect(firstWin).toBeTruthy();
    expect(getReactionSrc("win")).toBeTruthy();
    expect(getReactionSrc("win")).not.toBe(firstWin);
  });
});

async function renderReadyGame(initial = snapshot()) {
  controllerMocks.requestAttempt.mockResolvedValueOnce({
    status: "ready",
    attempt: initial,
  });
  render(<ConnectionsGameBoard puzzle={puzzle} />);

  if (initial.gameStatus === "won") {
    await screen.findByText("Puzzle complete!");
  } else if (initial.gameStatus === "lost") {
    await screen.findByText("Game over");
  } else {
    await screen.findByText(`Mistakes remaining: ${initial.mistakesRemaining}`);
  }
}

async function renderReadyGameWithTimers() {
  render(<ConnectionsGameBoard puzzle={puzzle} />);

  await act(async () => {
    await Promise.resolve();
  });
}

async function submitLabels(labels: string[]) {
  for (const tileLabel of labels) {
    fireEvent.click(screen.getByRole("button", { name: tileLabel }));
  }

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await Promise.resolve();
  });
}

function clearSelection(labels: string[]) {
  for (const tileLabel of labels) {
    fireEvent.click(screen.getByRole("button", { name: tileLabel }));
  }
}

function expectSelected(labels: string[]) {
  for (const tileLabel of labels) {
    expect(
      screen
        .getByRole("button", { name: tileLabel })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  }
}

function snapshot({
  attemptId = initialAttemptId,
  mistakes = 0,
  solvedGroups = [],
  status = "playing",
  version = 0,
}: {
  attemptId?: string;
  mistakes?: number;
  solvedGroups?: number[];
  status?: ConnectionsAttemptSnapshot["gameStatus"];
  version?: number;
} = {}): ConnectionsAttemptSnapshot {
  const solved = new Set(solvedGroups);
  const displayedGroupIndexes = status === "lost" ? [0, 1, 2, 3] : solvedGroups;

  return {
    attemptId,
    version,
    mistakesRemaining: Math.max(0, 4 - mistakes),
    gameStatus: status,
    remainingTiles:
      status === "playing"
        ? testConnectionsPuzzle.groups.flatMap((group, groupIndex) =>
            solved.has(groupIndex)
              ? []
              : group.tiles.map((tile) => ({
                  id: tokenForLabel(tile.label),
                  label: tile.label,
                })),
          )
        : [],
    displayedGroups: displayedGroupIndexes.map((groupIndex) => {
      const group = testConnectionsPuzzle.groups[groupIndex]!;

      return {
        category: group.category,
        tiles: group.tiles.map((tile) => ({
          id: tokenForLabel(tile.label),
          label: tile.label,
        })),
      };
    }),
  };
}

function tokenForLabel(tileLabel: string) {
  const index = testConnectionsPuzzle.groups
    .flatMap((group) => group.tiles)
    .findIndex((tile) => tile.label === tileLabel);

  return `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

function label(groupIndex: number, tileIndex: number) {
  return testConnectionsPuzzle.groups[groupIndex]!.tiles[tileIndex]!.label;
}

function groupLabels(groupIndex: number) {
  return testConnectionsPuzzle.groups[groupIndex]!.tiles.map(
    (tile) => tile.label,
  );
}

function mixedWrongLabels() {
  return [label(0, 0), label(0, 1), label(1, 0), label(1, 1)];
}

function getReaction(kind: "correct" | "incorrect" | "loss" | "win") {
  return document.querySelector(`[data-connections-reaction="${kind}"]`);
}

function getReactionSrc(kind: "correct" | "incorrect" | "loss" | "win") {
  return getReaction(kind)?.querySelector("img")?.getAttribute("src");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}
