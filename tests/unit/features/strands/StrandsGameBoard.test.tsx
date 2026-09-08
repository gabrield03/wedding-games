import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PublicStrandsPuzzle,
  StrandsAttemptSnapshot,
} from "@/contracts/strands";
import { testStrandsPuzzle } from "../../../fixtures/strands";

const mocks = vi.hoisted(() => ({
  bootstrapRetry: vi.fn(),
  requestAttempt: vi.fn(),
  requestHint: vi.fn(),
  requestPath: vi.fn(),
}));

vi.mock("@/app/games/AnonymousPlayerBootstrap", () => ({
  useAnonymousPlayerBootstrap: () => ({
    status: "ready" as const,
    retry: mocks.bootstrapRetry,
  }),
}));
vi.mock("@/features/strands/strandsApiClient", () => ({
  requestStrandsAttempt: mocks.requestAttempt,
  requestStrandsHint: mocks.requestHint,
  requestStrandsPath: mocks.requestPath,
}));

import { StrandsGameBoard } from "@/features/strands/StrandsGameBoard";

const NEXT_PUZZLE_ID = "wedding-02";
const ATTEMPT_ID = "60000000-0000-4000-8000-000000000301";
const publicPuzzle: PublicStrandsPuzzle = {
  id: testStrandsPuzzle.id,
  themeClue: testStrandsPuzzle.themeClue,
  grid: testStrandsPuzzle.grid,
  answerCount: testStrandsPuzzle.themeWords.length + 1,
};

beforeEach(() => {
  mocks.requestAttempt.mockResolvedValue({
    status: "ready",
    attempt: snapshot(),
  });
  mocks.requestHint.mockReset();
  mocks.requestPath.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("StrandsGameBoard", () => {
  it("prepares an authoritative Attempt before rendering the board", async () => {
    renderBoard();

    expect(screen.getByText("Preparing your game…")).toBeTruthy();

    await screen.findByRole("grid", { name: "Strands letter grid" });

    expect(mocks.requestAttempt).toHaveBeenCalledWith({
      puzzleId: publicPuzzle.id,
    });
    expect(screen.getByText("Found 0 of 7")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Next Puzzle" }).getAttribute("href"),
    ).toBe("/games/strands/" + NEXT_PUZZLE_ID);
  });

  it("keeps keyboard selection local until Submit sends the path and version", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    mocks.requestPath.mockResolvedValue({
      status: "submitted",
      outcome: "found_theme",
      attempt: snapshot({
        version: 1,
        foundAnswers: [
          {
            word: answer.word,
            kind: "theme",
            path: answer.path,
            themeIndex: 0,
          },
        ],
      }),
    });
    const { container } = renderBoard();
    await screen.findByRole("grid", { name: "Strands letter grid" });

    selectPathWithKeyboard(container, answer.path);

    expect(screen.getByRole("status").textContent).toContain(answer.word);
    expect(mocks.requestPath).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(mocks.requestPath).toHaveBeenCalledWith(ATTEMPT_ID, {
        path: answer.path,
        version: 0,
      }),
    );
    await screen.findByText("Found: " + answer.word);
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();

    const claimedTile = getTile(container, answer.path[0]!);
    expect(claimedTile.dataset.strandsClaimed).toBe("true");
    expect(claimedTile.getAttribute("aria-label")).toContain(
      "found in theme word " + answer.word,
    );
  });

  it("keeps roving keyboard focus and one-step backtracking local", async () => {
    const { container } = renderBoard();
    await screen.findByRole("grid", { name: "Strands letter grid" });
    const first = getTile(container, 0);

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const second = getTile(container, 1);
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(first, { key: "Enter" });
    fireEvent.keyDown(second, { key: " " });
    const diagonal = getTile(container, 7);
    fireEvent.keyDown(diagonal, { key: "Enter" });

    expect(screen.getByRole("status").textContent).toContain(
      "Selected word: CEW",
    );

    fireEvent.keyDown(diagonal, { key: "Backspace" });
    expect(screen.getByRole("status").textContent).toContain(
      "Selected word: CE",
    );

    fireEvent.keyDown(second, { key: "Escape" });
    expect(screen.getByText("Select adjacent letters.")).toBeTruthy();
  });

  it("renders a server-selected hint without exposing or solving its answer", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    const unorderedHint = [...answer.path].sort((first, second) => first - second);
    mocks.requestHint.mockResolvedValue({
      status: "ready",
      attempt: snapshot({
        version: 1,
        hintedTileIndexes: unorderedHint,
      }),
    });
    const { container } = renderBoard();
    await screen.findByRole("grid", { name: "Strands letter grid" });

    fireEvent.click(screen.getByRole("button", { name: "Hint" }));

    await screen.findByText("Hint highlighted on the board.");
    expect(mocks.requestHint).toHaveBeenCalledWith(ATTEMPT_ID, {
      version: 0,
    });
    expect(screen.getByText("Found 0 of 7")).toBeTruthy();
    expect(screen.queryByText(answer.word)).toBeNull();

    for (const tileIndex of unorderedHint) {
      expect(getTile(container, tileIndex).dataset.strandsHinted).toBe("true");
    }
  });

  it("reconciles a stale submission to the authoritative snapshot", async () => {
    const answer = testStrandsPuzzle.themeWords[0]!;
    mocks.requestPath.mockResolvedValue({
      status: "error",
      error: "stale_attempt",
      attempt: snapshot({
        version: 1,
        foundAnswers: [
          {
            word: answer.word,
            kind: "theme",
            path: answer.path,
            themeIndex: 0,
          },
        ],
      }),
    });
    const { container } = renderBoard();
    await screen.findByRole("grid", { name: "Strands letter grid" });

    selectPathWithKeyboard(container, testStrandsPuzzle.themeWords[1]!.path);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText(
      "Your game was updated. Make a new selection.",
    );
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();
    expect(screen.getByText("Select adjacent letters.")).toBeTruthy();
  });

  it("starts a fresh authoritative Attempt from Play Again", async () => {
    const complete = completeSnapshot();
    mocks.requestAttempt
      .mockResolvedValueOnce({ status: "ready", attempt: complete })
      .mockResolvedValueOnce({
        status: "ready",
        attempt: snapshot({
          attemptId: "60000000-0000-4000-8000-000000000399",
        }),
      });

    renderBoard();
    await screen.findByText("Puzzle complete!");
    expect(screen.getByRole("button", { name: "Play Again" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    await screen.findByText("Found 0 of 7");
    expect(mocks.requestAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.requestAttempt).toHaveBeenLastCalledWith({
      puzzleId: publicPuzzle.id,
    });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
});

function renderBoard() {
  return render(
    <StrandsGameBoard puzzle={publicPuzzle} nextPuzzleId={NEXT_PUZZLE_ID} />,
  );
}

function snapshot(
  overrides: Partial<StrandsAttemptSnapshot> = {},
): StrandsAttemptSnapshot {
  return {
    attemptId: ATTEMPT_ID,
    version: 0,
    puzzle: publicPuzzle,
    foundAnswers: [],
    hintedTileIndexes: null,
    gameStatus: "playing",
    ...overrides,
  };
}

function completeSnapshot(): StrandsAttemptSnapshot {
  return snapshot({
    version: publicPuzzle.answerCount,
    foundAnswers: [
      ...testStrandsPuzzle.themeWords.map((answer, themeIndex) => ({
        word: answer.word,
        kind: "theme" as const,
        path: answer.path,
        themeIndex,
      })),
      {
        word: testStrandsPuzzle.spangram.word,
        kind: "spangram" as const,
        path: testStrandsPuzzle.spangram.path,
      },
    ],
    gameStatus: "complete",
  });
}

function getTile(container: HTMLElement, tileIndex: number): HTMLButtonElement {
  const tile = container.querySelector(
    '[data-strands-tile="' + tileIndex + '"]',
  );

  if (!(tile instanceof HTMLButtonElement)) {
    throw new Error("Missing Strands tile " + tileIndex + ".");
  }

  return tile;
}

function selectPathWithKeyboard(container: HTMLElement, path: number[]) {
  for (const tileIndex of path) {
    fireEvent.keyDown(getTile(container, tileIndex), { key: "Enter" });
  }
}
