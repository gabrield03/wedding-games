import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StrandsGameBoard } from "@/features/strands/StrandsGameBoard";
import { testStrandsPuzzle } from "../../../fixtures/strands";

const NEXT_PUZZLE_ID = "wedding-02";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StrandsGameBoard", () => {
  it("renders the fixed letter grid with roving keyboard focus and active puzzle navigation", () => {
    const { container } = renderBoard();
    const cells = screen.getAllByRole("gridcell");

    expect(
      screen.getByRole("grid", { name: "Strands letter grid" }),
    ).toBeTruthy();
    expect(cells).toHaveLength(48);
    expect(getTile(container, 0).tabIndex).toBe(0);
    expect(getTile(container, 1).tabIndex).toBe(-1);
    expect(
      screen.getByText(/Use the arrow keys to move between letters/),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hint" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Next Puzzle" }).getAttribute("href"),
    ).toBe(`/games/strands/${NEXT_PUZZLE_ID}`);
  });

  it("moves focus spatially with arrow keys", () => {
    const { container } = renderBoard();
    const first = getTile(container, 0);

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });

    const second = getTile(container, 1);
    expect(document.activeElement).toBe(second);
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);

    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(document.activeElement).toBe(getTile(container, 7));
  });

  it("supports keyboard selection, one-step backtracking, and clearing", () => {
    const { container } = renderBoard();
    const first = getTile(container, 0);
    const second = getTile(container, 1);
    const diagonal = getTile(container, 7);

    fireEvent.keyDown(first, { key: "Enter" });
    fireEvent.keyDown(second, { key: " " });
    fireEvent.keyDown(diagonal, { key: "Enter" });

    expect(screen.getByRole("status").textContent).toContain(
      "Selected word: ABH",
    );
    expect(diagonal.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(diagonal, { key: "Backspace" });

    expect(screen.getByRole("status").textContent).toContain(
      "Selected word: AB",
    );
    expect(diagonal.getAttribute("aria-selected")).toBe("false");

    fireEvent.keyDown(second, { key: "Escape" });

    expect(screen.getByText("Select adjacent letters.")).toBeTruthy();
    expect(first.getAttribute("aria-selected")).toBe("false");
    expect(second.getAttribute("aria-selected")).toBe("false");
  });

  it("auto-resolves a theme word and keeps claimed tiles focusable", () => {
    const { container } = renderBoard();
    const answer = testStrandsPuzzle.themeWords[0]!;

    selectPathWithKeyboard(container, answer.path);

    expect(screen.getByText(`Found: ${answer.word}`)).toBeTruthy();
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();

    const claimedTile = getTile(container, answer.path[0]!);
    expect(claimedTile.getAttribute("aria-disabled")).toBe("true");
    expect(claimedTile.getAttribute("aria-label")).toContain(
      `found in theme word ${answer.word}`,
    );

    claimedTile.focus();
    expect(document.activeElement).toBe(claimedTile);
    fireEvent.keyDown(claimedTile, { key: "Enter" });
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();
  });

  it("outlines one unfound theme answer without showing its path, solving, or revealing its word", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container } = renderBoard();
    const hintedAnswer = testStrandsPuzzle.themeWords[0]!;

    fireEvent.click(screen.getByRole("button", { name: "Hint" }));

    expect(screen.getByRole("status").textContent).toContain(
      "Hint highlighted on the board.",
    );
    expect(screen.getByText("Found 0 of 7")).toBeTruthy();
    expect(screen.queryByText(hintedAnswer.word)).toBeNull();

    for (const tileIndex of hintedAnswer.path) {
      const tile = getTile(container, tileIndex);
      expect(tile.dataset.strandsHinted).toBe("true");
      expect(tile.getAttribute("aria-label")).toContain("hinted");
    }

    for (const tileIndex of testStrandsPuzzle.spangram.path) {
      expect(getTile(container, tileIndex).dataset.strandsHinted).toBe("false");
    }

    expect(container.querySelector("[data-strands-hint-path]")).toBeNull();
  });

  it("keeps the same hint on repeated requests until that answer is found", () => {
    const random = vi.spyOn(Math, "random").mockReturnValueOnce(0);
    const { container } = renderBoard();
    const firstTheme = testStrandsPuzzle.themeWords[0]!;
    const secondTheme = testStrandsPuzzle.themeWords[1]!;
    const hintButton = screen.getByRole("button", { name: "Hint" });

    fireEvent.click(hintButton);
    random.mockReturnValue(0.99);
    fireEvent.click(hintButton);

    expect(random).toHaveBeenCalledTimes(1);
    expect(getTile(container, firstTheme.path[0]!).dataset.strandsHinted).toBe(
      "true",
    );
    expect(getTile(container, secondTheme.path[0]!).dataset.strandsHinted).toBe(
      "false",
    );
  });

  it("clears a hint when its theme word is found and can hint another word", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container } = renderBoard();
    const firstTheme = testStrandsPuzzle.themeWords[0]!;
    const secondTheme = testStrandsPuzzle.themeWords[1]!;
    const hintButton = screen.getByRole("button", { name: "Hint" });

    fireEvent.click(hintButton);
    selectPathWithKeyboard(container, firstTheme.path);

    expect(getTile(container, firstTheme.path[0]!).dataset.strandsHinted).toBe(
      "false",
    );
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();

    fireEvent.click(hintButton);

    expect(getTile(container, secondTheme.path[0]!).dataset.strandsHinted).toBe(
      "true",
    );
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();
  });

  it("finds the spangram early without completing or blocking further play", () => {
    const { container } = renderBoard();

    selectPathWithKeyboard(container, testStrandsPuzzle.spangram.path);

    expect(
      screen.getByText(`Spangram found: ${testStrandsPuzzle.spangram.word}`),
    ).toBeTruthy();
    expect(screen.getByText("Found 1 of 7")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hint" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Next Puzzle" })).toBeTruthy();

    const nextThemeTile = getTile(
      container,
      testStrandsPuzzle.themeWords[0]!.path[0]!,
    );
    fireEvent.keyDown(nextThemeTile, { key: "Enter" });

    expect(nextThemeTile.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Selected word:");
  });

  it("completes only after every answer and keeps Play Again beside Next Puzzle", () => {
    const { container } = renderBoard();
    const answers = [
      ...testStrandsPuzzle.themeWords,
      testStrandsPuzzle.spangram,
    ];

    for (const answer of answers) {
      selectPathWithKeyboard(container, answer.path);
    }

    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(screen.getByText("Found 7 of 7")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hint" })).toBeNull();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Next Puzzle" }).getAttribute("href"),
    ).toBe(`/games/strands/${NEXT_PUZZLE_ID}`);

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(screen.getByText("Found 0 of 7")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hint" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next Puzzle" })).toBeTruthy();
    expect(getTile(container, 0).getAttribute("aria-disabled")).toBe("false");
  });
});

function renderBoard() {
  return render(
    <StrandsGameBoard
      puzzle={testStrandsPuzzle}
      nextPuzzleId={NEXT_PUZZLE_ID}
    />,
  );
}

function getTile(container: HTMLElement, tileIndex: number): HTMLButtonElement {
  const tile = container.querySelector(`[data-strands-tile="${tileIndex}"]`);

  if (!(tile instanceof HTMLButtonElement)) {
    throw new Error(`Missing Strands tile ${tileIndex}.`);
  }

  return tile;
}

function selectPathWithKeyboard(container: HTMLElement, path: number[]) {
  for (const tileIndex of path) {
    fireEvent.keyDown(getTile(container, tileIndex), { key: "Enter" });
  }
}
