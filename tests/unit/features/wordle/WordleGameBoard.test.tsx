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
    render(<WordleGameBoard puzzle={testPuzzle} />);

    const board = screen.getByRole("group", { name: "Wordle board" });

    expect(board.querySelectorAll("[data-wordle-row]")).toHaveLength(6);
    expect(board.querySelectorAll("[data-wordle-tile]")).toHaveLength(30);
  });

  it("renders readable special keys with a compact accessible Backspace control", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

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
    render(<WordleGameBoard puzzle={testPuzzle} />);

    enterWithOnScreenKeyboard("cranes");

    expect(
      screen.getByRole("group", { name: "Current guess: CRANE" }),
    ).toBeTruthy();
  });

  it("renders current letters with high-contrast text while empty tiles remain empty", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

    enterWithOnScreenKeyboard("C");

    const currentRow = screen.getByRole("group", {
      name: "Current guess: C",
    });
    const tiles = currentRow.querySelectorAll("[data-wordle-tile]");

    expect(tiles[0]!.textContent).toBe("C");
    expect(tiles[0]!.className).toContain("text-white");
    expect(tiles[0]!.getAttribute("data-status")).toBe("unsubmitted");
    expect(tiles[1]!.textContent).toBe("");
    expect(tiles[1]!.className).toContain("border-neutral-300");
  });

  it("removes the final current letter with Backspace", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

    enterWithOnScreenKeyboard("CRAN");
    fireEvent.click(
      within(keyboard()).getByRole("button", { name: "Backspace" }),
    );

    expect(
      screen.getByRole("group", { name: "Current guess: CRA" }),
    ).toBeTruthy();
  });

  it("submits stored evaluations, clears input, and updates key statuses", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

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
    expect(
      within(keyboard()).getByRole("button", { name: "C, correct" }),
    ).toBeTruthy();
    expect(
      within(keyboard()).getByRole("button", { name: "E, present" }),
    ).toBeTruthy();
    expect(
      within(keyboard()).getByRole("button", { name: "M, absent" }),
    ).toBeTruthy();
  });

  it("keeps the strongest observed keyboard status", () => {
    render(
      <WordleGameBoard
        puzzle={{ id: "keyboard-status-puzzle", answer: "APPLE" }}
      />,
    );

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
    render(<WordleGameBoard puzzle={testPuzzle} />);

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

  it("ignores Ctrl, Alt, and Meta keyboard shortcuts", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "a", altKey: true });
    fireEvent.keyDown(window, { key: "r", metaKey: true });

    expect(
      screen.getByRole("group", { name: "Current guess is empty" }),
    ).toBeTruthy();
  });

  it("does not apply a global action for keyboard events on a focused button", () => {
    render(<WordleGameBoard puzzle={testPuzzle} />);

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
        <WordleGameBoard puzzle={testPuzzle} />
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
