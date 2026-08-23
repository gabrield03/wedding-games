import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  WordleAttemptSnapshot,
  WordlePuzzlePreview,
} from "@/contracts/wordle";
import type {
  WordleLetterStatus,
  WordleSubmittedGuess,
} from "@/domain/wordle/types";
import { WordleGameBoard } from "@/features/wordle/WordleGameBoard";

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
vi.mock("@/features/wordle/wordleApiClient", () => ({
  requestWordleAttempt: controllerMocks.requestAttempt,
  requestWordleGuess: controllerMocks.requestGuess,
}));

const puzzle: WordlePuzzlePreview = { id: "test-wordle-puzzle" };
const canonicalHref = `/games/wordle/${puzzle.id}`;
const nextWordHref = `/games/wordle?exclude=${puzzle.id}`;
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
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("WordleGameBoard", () => {
  it("waits for Player bootstrap readiness before initializing", () => {
    controllerMocks.bootstrapStatus = "pending";

    renderBoard();

    expect(screen.getByRole("heading", { name: "Wordle" })).toBeTruthy();
    expect(screen.getByText("Preparing your game…")).toBeTruthy();
    expect(controllerMocks.requestAttempt).not.toHaveBeenCalled();
  });

  it("shows a bootstrap error and exposes a bounded retry action", () => {
    controllerMocks.bootstrapStatus = "error";

    renderBoard();

    expect(
      screen.getByText("We couldn’t prepare your player session."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(controllerMocks.bootstrapRetry).toHaveBeenCalledTimes(1);
    expect(controllerMocks.requestAttempt).not.toHaveBeenCalled();
  });

  it("initializes canonical and selected routes with their explicit modes", async () => {
    const first = renderBoard();
    await expectReadyBoard();

    expect(controllerMocks.requestAttempt).toHaveBeenNthCalledWith(1, {
      puzzleId: puzzle.id,
      startMode: "resume",
    });

    controllerMocks.requestAttempt.mockResolvedValueOnce({
      status: "ready",
      attempt: snapshot({ attemptId: "attempt-new" }),
    });
    first.rerender(
      board({ startMode: "new", initializationRequest: "request-one" }),
    );

    await waitFor(() =>
      expect(controllerMocks.requestAttempt).toHaveBeenNthCalledWith(2, {
        puzzleId: puzzle.id,
        startMode: "new",
      }),
    );
  });

  it("reinitializes repeated same-puzzle new-game requests without relying on a component key", async () => {
    const rendered = renderBoard({
      startMode: "new",
      initializationRequest: "request-one",
    });
    await expectReadyBoard();

    controllerMocks.requestAttempt.mockResolvedValueOnce({
      status: "ready",
      attempt: snapshot({ attemptId: "attempt-two" }),
    });
    rendered.rerender(
      board({ startMode: "new", initializationRequest: "request-two" }),
    );
    await waitFor(() =>
      expect(controllerMocks.requestAttempt).toHaveBeenCalledTimes(2),
    );

    controllerMocks.requestAttempt.mockResolvedValueOnce({
      status: "ready",
      attempt: snapshot({ attemptId: "attempt-three" }),
    });
    rendered.rerender(
      board({ startMode: "new", initializationRequest: "request-three" }),
    );
    await waitFor(() =>
      expect(controllerMocks.requestAttempt).toHaveBeenCalledTimes(3),
    );

    expect(controllerMocks.requestAttempt).toHaveBeenNthCalledWith(3, {
      puzzleId: puzzle.id,
      startMode: "new",
    });
  });

  it("canonicalizes a new-game marker only after successful initialization", async () => {
    let resolveAttempt!: (value: unknown) => void;
    controllerMocks.requestAttempt.mockReturnValue(
      new Promise((resolve) => {
        resolveAttempt = resolve;
      }),
    );
    window.history.replaceState(
      null,
      "",
      `${canonicalHref}?start=new&request=request-one`,
    );
    const replaceState = vi.spyOn(window.history, "replaceState");

    renderBoard({ startMode: "new", initializationRequest: "request-one" });
    expect(replaceState).not.toHaveBeenCalled();

    await act(async () => {
      resolveAttempt({ status: "ready", attempt: snapshot() });
    });

    await waitFor(() =>
      expect(replaceState).toHaveBeenCalledWith(null, "", canonicalHref),
    );
    expect(window.location.pathname).toBe(canonicalHref);
    expect(window.location.search).toBe("");
  });

  it("always renders six rows with five tiles after initialization", async () => {
    await renderReadyBoard();

    const wordleBoard = screen.getByRole("group", { name: "Wordle board" });
    expect(wordleBoard.querySelectorAll("[data-wordle-row]")).toHaveLength(6);
    expect(wordleBoard.querySelectorAll("[data-wordle-tile]")).toHaveLength(30);
  });

  it("shares normalized five-letter input and submission across the on-screen and physical keyboards", async () => {
    controllerMocks.requestGuess.mockResolvedValueOnce({
      status: "submitted",
      attempt: snapshot({
        guesses: [
          evaluated("CRANE", [
            "correct",
            "present",
            "absent",
            "absent",
            "correct",
          ]),
        ],
      }),
    });
    await renderReadyBoard();

    enterOnScreen("cranes");
    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();
    submitOnScreen();

    await waitFor(() =>
      expect(controllerMocks.requestGuess).toHaveBeenCalledWith(
        initialAttemptId,
        { guess: "CRANE", version: 0 },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("group", { name: "Current guess is empty" }),
      ).toBeTruthy(),
    );

    controllerMocks.requestGuess.mockResolvedValueOnce({
      status: "submitted",
      attempt: snapshot({
        guesses: [
          evaluated("CRANE", [
            "correct",
            "present",
            "absent",
            "absent",
            "correct",
          ]),
          evaluated("BLOAT", [
            "absent",
            "correct",
            "present",
            "absent",
            "absent",
          ]),
        ],
      }),
    });

    for (const key of "bloat") {
      fireEvent.keyDown(window, { key });
    }
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() =>
      expect(controllerMocks.requestGuess).toHaveBeenLastCalledWith(
        initialAttemptId,
        { guess: "BLOAT", version: 1 },
      ),
    );
  });

  it("retriggerably shakes an incomplete row without calling the backend", async () => {
    await renderReadyBoard();
    enterOnScreen("CRA");
    submitOnScreen();

    const firstRow = screen.getByRole("group", { name: "Current guess: CRA" });
    expect(screen.getByText("Not enough letters")).toBeTruthy();
    expect(firstRow.className).toContain("wordle-row-shake");
    expect(controllerMocks.requestGuess).not.toHaveBeenCalled();

    submitOnScreen();
    const secondRow = screen.getByRole("group", { name: "Current guess: CRA" });
    expect(secondRow).not.toBe(firstRow);

    fireEvent.click(letterKey("N"));
    expect(screen.queryByText("Not enough letters")).toBeNull();
  });

  it("does not optimistically clear or evaluate a guess while submission is pending", async () => {
    let resolveGuess!: (value: unknown) => void;
    controllerMocks.requestGuess.mockReturnValue(
      new Promise((resolve) => {
        resolveGuess = resolve;
      }),
    );
    await renderReadyBoard();
    enterOnScreen("CRANE");
    submitOnScreen();

    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();
    expect(screen.queryByRole("group", { name: /^Guess 1:/ })).toBeNull();
    expect(
      (
        within(keyboard()).getByRole("button", {
          name: "Enter",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await act(async () => {
      resolveGuess({
        status: "submitted",
        attempt: snapshot({
          guesses: [
            evaluated("CRANE", [
              "correct",
              "present",
              "absent",
              "absent",
              "correct",
            ]),
          ],
        }),
      });
    });

    expect(screen.getByRole("group", { name: /^Guess 1:/ })).toBeTruthy();
  });

  it("reveals only an accepted row and delays its keyboard colors until reveal completion", async () => {
    vi.useFakeTimers();
    controllerMocks.requestGuess.mockResolvedValue({
      status: "submitted",
      attempt: snapshot({
        guesses: [
          evaluated("CRANE", [
            "correct",
            "present",
            "absent",
            "absent",
            "correct",
          ]),
        ],
      }),
    });
    renderBoard();
    await act(async () => Promise.resolve());
    enterOnScreen("CRANE");
    submitOnScreen();
    await act(async () => Promise.resolve());

    const submittedRow = screen.getByRole("group", { name: /^Guess 1:/ });
    const tiles = submittedRow.querySelectorAll("[data-wordle-tile]");
    expect(
      Array.from(tiles).every((tile) =>
        tile.className.includes("wordle-tile-reveal"),
      ),
    ).toBe(true);
    expect(
      Array.from(tiles, (tile) => (tile as HTMLElement).style.animationDelay),
    ).toEqual(["0ms", "50ms", "100ms", "150ms", "200ms"]);
    expect(letterKey("C").getAttribute("aria-label")).toBe("C");
    expect(
      (
        within(keyboard()).getByRole("button", {
          name: "Enter",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);

    act(() => vi.advanceTimersByTime(600));

    expect(letterKey("C").className).toContain("bg-green-700");
    expect(letterKey("R").className).toContain("bg-amber-500");
    expect(letterKey("A").className).toContain("bg-neutral-600");
  });

  it("does not animate historical rows loaded during active or terminal resume", async () => {
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({
        guesses: [
          evaluated("CRANE", [
            "correct",
            "present",
            "absent",
            "absent",
            "correct",
          ]),
        ],
      }),
    });
    await renderReadyBoard();

    const tiles = screen
      .getByRole("group", { name: /^Guess 1:/ })
      .querySelectorAll("[data-wordle-tile]");
    expect(
      Array.from(tiles).every(
        (tile) => !tile.className.includes("wordle-tile-reveal"),
      ),
    ).toBe(true);
    expect(letterKey("C").className).toContain("bg-green-700");
  });

  it("preserves an invalid word and authoritative keyboard state until successful editing", async () => {
    controllerMocks.requestGuess.mockResolvedValue({
      status: "error",
      error: "invalid_word",
      attempt: snapshot(),
    });
    await renderReadyBoard();
    enterOnScreen("QZXQZ");
    submitOnScreen();

    expect(await screen.findByText("Not in word list.")).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Current guess: QZXQZ" }),
    ).toBeTruthy();
    expect(controllerMocks.requestGuess).toHaveBeenCalledWith(
      initialAttemptId,
      { guess: "QZXQZ", version: 0 },
    );
    expect(letterKey("Q").getAttribute("data-status")).toBe("unused");

    fireEvent.click(
      within(keyboard()).getByRole("button", { name: "Backspace" }),
    );
    expect(screen.queryByText("Not in word list.")).toBeNull();
    expect(
      screen.getByRole("group", { name: "Current guess: QZXQ" }),
    ).toBeTruthy();
  });

  it("reconciles stale state without animation and preserves a playable typed word", async () => {
    controllerMocks.requestGuess.mockResolvedValue({
      status: "error",
      error: "stale_attempt",
      attempt: snapshot({
        guesses: [
          evaluated("CRANE", [
            "correct",
            "present",
            "absent",
            "absent",
            "correct",
          ]),
        ],
      }),
    });
    await renderReadyBoard();
    enterOnScreen("BLOAT");
    submitOnScreen();

    expect(
      await screen.findByText(
        "Your game was updated. Review your word and try again.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Current guess: BLOAT" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: /^Guess 1:/ })
        .querySelector(".wordle-tile-reveal"),
    ).toBeNull();
  });

  it("preserves the typed word and authoritative snapshot on network failure", async () => {
    controllerMocks.requestGuess.mockRejectedValue(new Error("offline"));
    await renderReadyBoard();
    enterOnScreen("CRANE");
    submitOnScreen();

    expect(
      await screen.findByText(
        "We couldn’t submit that guess. Your word is still here; try again.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();
    expect(
      (
        within(keyboard()).getByRole("button", {
          name: "Enter",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("renders authoritative win and sixth-attempt win snapshots without a separate answer", async () => {
    const fiveMisses = Array.from({ length: 5 }, () =>
      evaluated("BLOAT", ["absent", "absent", "absent", "absent", "absent"]),
    );
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({
        status: "won",
        guesses: [
          ...fiveMisses,
          evaluated("CRANE", [
            "correct",
            "correct",
            "correct",
            "correct",
            "correct",
          ]),
        ],
      }),
    });
    await renderReadyBoard();

    expect(screen.getByRole("status").textContent).toBe("You got it!");
    expect(screen.queryByText(/answer was/i)).toBeNull();
    expect(screen.getAllByRole("group", { name: /^Guess \d:/ })).toHaveLength(
      6,
    );
    expect(screen.getByRole("link", { name: "Next Word" })).toBeTruthy();
  });

  it("renders an authoritative loss answer and clears obsolete input on terminal reconciliation", async () => {
    const loss = snapshot({
      status: "lost",
      revealedAnswer: "CRANE",
      guesses: Array.from({ length: 6 }, () =>
        evaluated("BLOAT", ["absent", "absent", "absent", "absent", "absent"]),
      ),
    });
    controllerMocks.requestGuess.mockResolvedValue({
      status: "error",
      error: "invalid_action",
      attempt: loss,
    });
    await renderReadyBoard();
    enterOnScreen("BLOAT");
    submitOnScreen();

    expect(
      await screen.findByText("Game over. The answer was CRANE."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("group", { name: "Current guess: BLOAT" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Next Word" })).toBeTruthy();
  });

  it("keeps correct over present over absent keyboard precedence from authoritative evaluations", async () => {
    controllerMocks.requestAttempt.mockResolvedValue({
      status: "ready",
      attempt: snapshot({
        guesses: [
          evaluated("ALLEY", [
            "absent",
            "present",
            "absent",
            "absent",
            "absent",
          ]),
          evaluated("BLOAT", [
            "absent",
            "correct",
            "absent",
            "absent",
            "absent",
          ]),
          evaluated("SLATE", [
            "absent",
            "present",
            "absent",
            "absent",
            "absent",
          ]),
        ],
      }),
    });
    await renderReadyBoard();

    const correctL = within(keyboard()).getByRole("button", {
      name: "L, correct",
    });
    expect(correctL.className).toContain("bg-green-700");
    expect(letterKey("A").className).toContain("bg-neutral-600");
  });

  it("uses practical responsive touch targets without changing horizontal flex sizing", async () => {
    await renderReadyBoard();

    const letter = letterKey("Q");
    const enter = within(keyboard()).getByRole("button", { name: "Enter" });
    const backspace = within(keyboard()).getByRole("button", {
      name: "Backspace",
    });

    for (const key of [letter, enter, backspace]) {
      expect(key.className).toContain("min-h-[52px]");
      expect(key.className).toContain("sm:min-h-14");
      expect(key.className).toContain("touch-manipulation");
      expect(key.className).toContain("min-w-0");
    }
  });

  it("ignores shortcuts and keyboard events from interactive controls", async () => {
    await renderReadyBoard();
    fireEvent.keyDown(window, { key: "C", ctrlKey: true });
    fireEvent.keyDown(window, { key: "A", altKey: true });
    const enter = within(keyboard()).getByRole("button", { name: "Enter" });
    enter.focus();
    fireEvent.keyDown(enter, { key: "Enter" });

    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
    expect(controllerMocks.requestGuess).not.toHaveBeenCalled();
  });
});

function board(
  overrides: Partial<{
    startMode: "resume" | "new";
    initializationRequest: string;
  }> = {},
) {
  const startMode = overrides.startMode ?? "resume";

  return (
    <WordleGameBoard
      puzzle={puzzle}
      startMode={startMode}
      initializationRequest={overrides.initializationRequest ?? startMode}
      canonicalHref={canonicalHref}
      nextWordHref={nextWordHref}
    />
  );
}

function renderBoard(
  overrides: Partial<{
    startMode: "resume" | "new";
    initializationRequest: string;
  }> = {},
) {
  return render(board(overrides));
}

async function renderReadyBoard() {
  const result = renderBoard();
  await expectReadyBoard();
  return result;
}

async function expectReadyBoard() {
  return screen.findByRole("group", { name: "Wordle board" });
}

function keyboard() {
  return screen.getByRole("group", { name: "On-screen keyboard" });
}

function letterKey(letter: string) {
  return within(keyboard()).getByRole("button", {
    name: new RegExp(`^${letter}(?:, (?:correct|present|absent))?$`, "i"),
  });
}

function enterOnScreen(guess: string) {
  for (const letter of guess) {
    fireEvent.click(letterKey(letter));
  }
}

function submitOnScreen() {
  fireEvent.click(within(keyboard()).getByRole("button", { name: "Enter" }));
}

function evaluated(
  guess: string,
  statuses: WordleLetterStatus[],
): WordleSubmittedGuess {
  return {
    guess,
    evaluation: [...guess].map((letter, index) => ({
      letter,
      status: statuses[index]!,
    })),
  };
}

function snapshot({
  attemptId = initialAttemptId,
  guesses = [],
  status = "playing",
  revealedAnswer,
}: {
  attemptId?: string;
  guesses?: WordleSubmittedGuess[];
  status?: WordleAttemptSnapshot["gameStatus"];
  revealedAnswer?: string;
} = {}): WordleAttemptSnapshot {
  return {
    attemptId,
    version: guesses.length,
    submittedGuesses: guesses,
    gameStatus: status,
    ...(revealedAnswer ? { revealedAnswer } : {}),
  };
}
