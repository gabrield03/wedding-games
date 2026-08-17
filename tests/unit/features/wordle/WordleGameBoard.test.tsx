import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { WordlePuzzle } from "@/domain/wordle/types";
import { WordleGameBoard } from "@/features/wordle/WordleGameBoard";

const testPuzzle: WordlePuzzle = {
  id: "test-wordle-puzzle",
  answer: "CRANE",
};
const nextWordHref = "/games/wordle?exclude=test-wordle-puzzle";

function renderWordleGameBoard(puzzle = testPuzzle) {
  return render(
    <WordleGameBoard puzzle={puzzle} nextWordHref={nextWordHref} />,
  );
}

afterEach(cleanup);

function keyboard() {
  return screen.getByRole("group", { name: "On-screen keyboard" });
}

function letterKey(letter: string) {
  return within(keyboard()).getByRole("button", {
    name: new RegExp(`^${letter}(?:, (?:correct|present|absent))?$`, "i"),
  });
}

function enterWithOnScreenKeyboard(guess: string) {
  for (const letter of guess) {
    fireEvent.click(letterKey(letter));
  }
}

function submitWithOnScreenKeyboard() {
  fireEvent.click(within(keyboard()).getByRole("button", { name: "Enter" }));
}

describe("WordleGameBoard", () => {
  it("always renders six rows with five tiles each", () => {
    renderWordleGameBoard();

    const board = screen.getByRole("group", { name: "Wordle board" });

    expect(board.querySelectorAll("[data-wordle-row]")).toHaveLength(6);
    expect(board.querySelectorAll("[data-wordle-tile]")).toHaveLength(30);
  });

  it("renders readable special keys with a compact accessible Backspace control", () => {
    renderWordleGameBoard();

    const enterKey = within(keyboard()).getByRole("button", { name: "Enter" });
    const backspaceKey = within(keyboard()).getByRole("button", {
      name: "Backspace",
    });

    expect(enterKey.textContent).toBe("Enter");
    expect(enterKey.className).toContain("bg-neutral-200");
    expect(enterKey.className).toContain("text-neutral-950");
    expect(enterKey.className).toContain("text-[9px]");
    expect(backspaceKey.textContent).toBe("⌫");
    expect(backspaceKey.getAttribute("aria-label")).toBe("Backspace");
    expect(backspaceKey.className).toContain("text-neutral-950");
  });

  it("enters uppercase letters and enforces the five-letter cap", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("cranes");

    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();
  });

  it("renders theme-aware current letters and instruction text", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("C");

    const currentRow = screen.getByRole("group", {
      name: "Current guess: C",
    });
    const tiles = currentRow.querySelectorAll("[data-wordle-tile]");

    expect(tiles[0]!.textContent).toBe("C");
    expect(tiles[0]!.className).toContain("text-foreground");
    expect(tiles[0]!.className).toContain("dark:border-neutral-300");
    expect(tiles[0]!.className).not.toContain("text-white");
    expect(tiles[0]!.getAttribute("data-status")).toBe("unsubmitted");
    expect(tiles[1]!.textContent).toBe("");
    expect(tiles[1]!.className).toContain("border-neutral-300");
    expect(
      screen.getByText("Guess the five-letter word in six attempts.").className,
    ).toContain("dark:text-neutral-400");
  });

  it("removes the final current letter with Backspace", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CRAN");
    fireEvent.click(
      within(keyboard()).getByRole("button", { name: "Backspace" }),
    );

    expect(
      screen.getByRole("group", { name: "Current guess: CRA" }),
    ).toBeTruthy();
  });

  it("retriggerably shakes an incomplete row and clears the presentation on letter entry", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CRA");
    submitWithOnScreenKeyboard();

    expect(screen.getByRole("status").textContent).toBe("Not enough letters");
    const firstShakingRow = screen.getByRole("group", {
      name: "Current guess: CRA",
    });

    expect(firstShakingRow.className).toContain("wordle-row-shake");
    expect(screen.queryByRole("group", { name: /^Guess 1:/ })).toBeNull();

    submitWithOnScreenKeyboard();

    const retriggeredShakingRow = screen.getByRole("group", {
      name: "Current guess: CRA",
    });

    expect(retriggeredShakingRow).not.toBe(firstShakingRow);
    expect(retriggeredShakingRow.className).toContain("wordle-row-shake");

    fireEvent.click(letterKey("N"));

    expect(screen.getByRole("status").textContent).toBe("");
    const editedRow = screen.getByRole("group", {
      name: "Current guess: CRAN",
    });

    expect(editedRow.className).not.toContain("wordle-row-shake");
  });

  it("clears incomplete feedback on Backspace", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CRA");
    submitWithOnScreenKeyboard();

    expect(screen.getByText("Not enough letters")).toBeTruthy();

    fireEvent.click(
      within(keyboard()).getByRole("button", { name: "Backspace" }),
    );

    expect(screen.queryByText("Not enough letters")).toBeNull();
    expect(
      screen.getByRole("group", { name: "Current guess: CR" }),
    ).toBeTruthy();
  });

  it("keeps incomplete feedback cleared after a successful submission", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CREA");
    submitWithOnScreenKeyboard();

    expect(screen.getByText("Not enough letters")).toBeTruthy();

    fireEvent.click(letterKey("M"));
    submitWithOnScreenKeyboard();

    expect(screen.queryByText("Not enough letters")).toBeNull();
    expect(
      screen.getByRole("group", {
        name: "Guess 1: C correct, R correct, E present, A present, M absent",
      }),
    ).toBeTruthy();
  });

  it("submits stored evaluations, clears input, and updates key statuses", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CREAM");
    submitWithOnScreenKeyboard();

    expect(
      screen.getByRole("group", {
        name: "Guess 1: C correct, R correct, E present, A present, M absent",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
    const correctKey = within(keyboard()).getByRole("button", {
      name: "C, correct",
    });
    const presentKey = within(keyboard()).getByRole("button", {
      name: "E, present",
    });
    const absentKey = within(keyboard()).getByRole("button", {
      name: "M, absent",
    });

    expect(correctKey.className).toContain("bg-neutral-300");
    expect(presentKey.className).toContain("bg-neutral-300");
    expect(absentKey.className).toContain("bg-neutral-600");
  });

  it("reveals only the newest submitted row with staggered tile delays", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CREAM");
    submitWithOnScreenKeyboard();

    const firstSubmittedRow = screen.getByRole("group", {
      name: /^Guess 1:/,
    });
    const firstRowTiles =
      firstSubmittedRow.querySelectorAll("[data-wordle-tile]");

    expect(
      Array.from(firstRowTiles, (tile) => tile.className).every((className) =>
        className.includes("wordle-tile-reveal"),
      ),
    ).toBe(true);
    expect(
      Array.from(
        firstRowTiles,
        (tile) => (tile as HTMLElement).style.animationDelay,
      ),
    ).toEqual(["0ms", "50ms", "100ms", "150ms", "200ms"]);

    enterWithOnScreenKeyboard("BLOAT");
    submitWithOnScreenKeyboard();

    const olderRowTiles = screen
      .getByRole("group", { name: /^Guess 1:/ })
      .querySelectorAll("[data-wordle-tile]");
    const newestRowTiles = screen
      .getByRole("group", { name: /^Guess 2:/ })
      .querySelectorAll("[data-wordle-tile]");

    expect(
      Array.from(olderRowTiles, (tile) => tile.className).every(
        (className) => !className.includes("wordle-tile-reveal"),
      ),
    ).toBe(true);
    expect(
      Array.from(newestRowTiles, (tile) => tile.className).every((className) =>
        className.includes("wordle-tile-reveal"),
      ),
    ).toBe(true);
  });

  it("keeps the strongest observed keyboard status", () => {
    renderWordleGameBoard({
      id: "keyboard-status-puzzle",
      answer: "APPLE",
    });

    enterWithOnScreenKeyboard("ALLEY");
    submitWithOnScreenKeyboard();

    expect(
      within(keyboard()).getByRole("button", { name: "L, present" }),
    ).toBeTruthy();

    enterWithOnScreenKeyboard("ZZZLZ");
    submitWithOnScreenKeyboard();

    expect(
      within(keyboard()).getByRole("button", { name: "L, correct" }),
    ).toBeTruthy();

    enterWithOnScreenKeyboard("ALLEY");
    submitWithOnScreenKeyboard();

    expect(
      within(keyboard()).getByRole("button", { name: "L, correct" }),
    ).toBeTruthy();
  });

  it("uses physical letter, Backspace, and Enter input", () => {
    renderWordleGameBoard();

    for (const key of ["c", "r", "a"]) {
      fireEvent.keyDown(window, { key });
    }

    fireEvent.keyDown(window, { key: "Backspace" });

    for (const key of ["a", "n", "e"]) {
      fireEvent.keyDown(window, { key });
    }

    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "Enter" });

    expect(
      screen.getByRole("group", {
        name: "Guess 1: C correct, R correct, A correct, N correct, E correct",
      }),
    ).toBeTruthy();

    for (const button of within(keyboard()).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("shows a win while keeping the completed board and disabled keyboard visible", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CRANE");
    submitWithOnScreenKeyboard();

    expect(screen.getByRole("status").textContent).toBe("You got it!");
    expect(screen.getByRole("group", { name: "Wordle board" })).toBeTruthy();
    expect(keyboard()).toBeTruthy();
    const nextWordLink = screen.getByRole("link", { name: "Next Word" });

    expect(nextWordLink.getAttribute("href")).toBe(nextWordHref);

    for (const button of within(keyboard()).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }

    fireEvent.keyDown(window, { key: "A" });

    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
  });

  it("shows a loss and reveals the answer after the sixth unsuccessful guess", () => {
    renderWordleGameBoard({ id: "loss-puzzle", answer: "APPLE" });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      enterWithOnScreenKeyboard("CRANE");
      submitWithOnScreenKeyboard();
    }

    expect(screen.getByRole("status").textContent).toBe(
      "Game over. The answer was APPLE.",
    );
    expect(screen.getAllByRole("group", { name: /^Guess \d:/ })).toHaveLength(
      6,
    );
    expect(screen.getByRole("group", { name: "Wordle board" })).toBeTruthy();
    expect(keyboard()).toBeTruthy();
    const nextWordLink = screen.getByRole("link", { name: "Next Word" });

    expect(nextWordLink.getAttribute("href")).toBe(nextWordHref);

    for (const button of within(keyboard()).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }

    fireEvent.keyDown(window, { key: "A" });

    expect(screen.getAllByRole("group", { name: /^Guess \d:/ })).toHaveLength(
      6,
    );
  });

  it("ignores Ctrl, Alt, and Meta keyboard shortcuts", () => {
    renderWordleGameBoard();

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "a", altKey: true });
    fireEvent.keyDown(window, { key: "r", metaKey: true });

    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
  });

  it("does not apply a global action for keyboard events on a focused button", () => {
    renderWordleGameBoard();

    enterWithOnScreenKeyboard("CREAM");
    const focusedLetterKey = letterKey("C");

    focusedLetterKey.focus();
    fireEvent.keyDown(focusedLetterKey, { key: "Enter" });
    fireEvent.click(focusedLetterKey);

    expect(
      screen.getByRole("group", { name: "Current guess: CREAM" }),
    ).toBeTruthy();
    expect(screen.queryByRole("group", { name: /^Guess 1:/ })).toBeNull();
  });

  it("does not apply global Wordle input to an editable control", () => {
    render(
      <>
        <input aria-label="Separate text input" />
        <WordleGameBoard puzzle={testPuzzle} nextWordHref={nextWordHref} />
      </>,
    );

    const textInput = screen.getByRole("textbox", {
      name: "Separate text input",
    });

    fireEvent.keyDown(textInput, { key: "A" });

    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
  });
});
