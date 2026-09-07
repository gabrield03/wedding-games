import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { miniCrosswordPuzzles } from "@/content/miniCrossword/puzzles";
import { MiniCrosswordGameBoard } from "@/features/miniCrossword/MiniCrosswordGameBoard";

const puzzle = miniCrosswordPuzzles[0]!;

afterEach(() => {
  cleanup();
});

describe("MiniCrosswordGameBoard", () => {
  it("renders numbered cells, blocks, and Across/Down clues", () => {
    const { container } = renderBoard();

    expect(
      screen.getByRole("grid", { name: "Mini Crossword board" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("gridcell")).toHaveLength(25);
    expect(container.querySelectorAll("[data-mini-crossword-block]")).toHaveLength(
      6,
    );
    expect(screen.getByRole("heading", { name: "Across" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Down" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /1\. Understand, as a joke/ })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /1\. Things partners may share after one gets a cold/,
      }),
    ).toBeTruthy();
  });

  it("toggles Across and Down when the selected crossing cell is clicked again", () => {
    const { container } = renderBoard();
    const firstCell = getCell(container, 0, 2);

    expect(screen.getByRole("status").textContent).toContain("1 Across");

    fireEvent.click(firstCell);

    expect(screen.getByRole("status").textContent).toContain("1 Down");
    expect(firstCell.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(firstCell);

    expect(screen.getByRole("status").textContent).toContain("1 Across");
  });

  it("types into the active answer, advances, and backspaces backward", () => {
    const { container } = renderBoard();
    const section = getGameSection();
    const firstCell = getCell(container, 0, 2);
    const secondCell = getCell(container, 0, 3);

    fireEvent.keyDown(section, { key: "g" });

    expect(firstCell.getAttribute("aria-label")).toContain("letter G");
    expect(secondCell.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(section, { key: "Backspace" });

    expect(firstCell.getAttribute("aria-label")).toContain("empty");
    expect(firstCell.getAttribute("aria-selected")).toBe("true");
  });

  it("selects a clue and highlights its answer cells", () => {
    const { container } = renderBoard();

    fireEvent.click(
      screen.getByRole("button", {
        name: /4\. Challenge for a playful date night/,
      }),
    );

    expect(screen.getByRole("status").textContent).toContain("4 Down");

    for (const [row, column] of [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ]) {
      expect(
        getCell(container, row, column).dataset.activeAnswer,
      ).toBe("true");
    }

    expect(getCell(container, 1, 1).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("keeps Submit disabled until full and gives only ambiguous incorrect feedback", () => {
    const { container } = renderBoard();
    const submit = screen.getByRole("button", { name: "Submit" });

    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fillBoard(container, { wrongCell: "0-2" });

    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    expect(screen.getByRole("status").textContent).toContain(
      "Something's not right.",
    );
    expect(screen.queryByText(/incorrect cell/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
  });

  it("completes only after Submit and Play Again clears the board", () => {
    const { container } = renderBoard();
    const submit = screen.getByRole("button", { name: "Submit" });

    fillBoard(container);

    expect(screen.queryByText("Puzzle complete!")).toBeNull();
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(submit);

    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(screen.queryByText("Puzzle complete!")).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    for (let row = 0; row < puzzle.grid.rows; row += 1) {
      for (let column = 0; column < puzzle.grid.columns; column += 1) {
        if (puzzle.grid.solution[row]![column] === "#") {
          continue;
        }

        expect(getCell(container, row, column).getAttribute("aria-label")).toContain(
          "empty",
        );
      }
    }
  });
});

function renderBoard() {
  return render(<MiniCrosswordGameBoard puzzle={puzzle} />);
}

function getGameSection(): HTMLElement {
  const heading = screen.getByRole("heading", { name: "Mini Crossword" });
  const section = heading.closest("section");

  if (!section) {
    throw new Error("Missing Mini Crossword game section.");
  }

  return section;
}

function getCell(
  container: HTMLElement,
  row: number,
  column: number,
): HTMLButtonElement {
  const cell = container.querySelector(
    `[data-mini-crossword-cell="${row}-${column}"]`,
  );

  if (!(cell instanceof HTMLButtonElement)) {
    throw new Error(`Missing Mini Crossword cell ${row}-${column}.`);
  }

  return cell;
}

function fillBoard(
  container: HTMLElement,
  options: { wrongCell?: string } = {},
) {
  const section = getGameSection();

  for (let row = 0; row < puzzle.grid.rows; row += 1) {
    for (let column = 0; column < puzzle.grid.columns; column += 1) {
      const solutionLetter = puzzle.grid.solution[row]![column]!;

      if (solutionLetter === "#") {
        continue;
      }

      fireEvent.click(getCell(container, row, column));
      fireEvent.keyDown(section, {
        key:
          options.wrongCell === `${row}-${column}`
            ? solutionLetter === "Z"
              ? "X"
              : "Z"
            : solutionLetter,
      });
    }
  }
}
