import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";
import { testConnectionsPuzzle } from "../../../fixtures/connections";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function tileLabel(groupIndex: number, tileIndex: number) {
  return testConnectionsPuzzle.groups[groupIndex]!.tiles[tileIndex]!.label;
}

function submitTiles(labels: string[]) {
  for (const label of labels) {
    fireEvent.click(screen.getByRole("button", { name: label }));
  }

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
}

function getReaction(kind: "correct" | "incorrect" | "loss" | "win") {
  return document.querySelector(`[data-connections-reaction="${kind}"]`);
}

function getReactionSrc(kind: "correct" | "incorrect" | "loss" | "win") {
  return getReaction(kind)?.querySelector("img")?.getAttribute("src");
}

describe("ConnectionsGameBoard", () => {
  it("renders all 16 puzzle tiles", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const tileButtons = screen.getAllByRole("button", {
      pressed: false,
    });

    expect(tileButtons).toHaveLength(16);
  });

  it("selects and deselects a tile", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const label = tileLabel(0, 0);
    const tile = screen.getByRole("button", { name: label });

    fireEvent.click(tile);

    expect(tile.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(tile);

    expect(tile.getAttribute("aria-pressed")).toBe("false");
  });

  it("allows at most four tiles to be selected", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const tileLabels = [
      tileLabel(0, 0),
      tileLabel(0, 1),
      tileLabel(0, 2),
      tileLabel(0, 3),
      tileLabel(1, 0),
    ];

    for (const label of tileLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    for (const label of tileLabels.slice(0, 4)) {
      expect(
        screen
          .getByRole("button", { name: label })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    }

    expect(
      screen
        .getByRole("button", { name: tileLabels[4] })
        .getAttribute("aria-pressed"),
    ).toBe("false");

    expect(screen.getByText("4 / 4 selected")).toBeTruthy();
  });

  it("enables Submit only when exactly four tiles are selected", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const submitButton = screen.getByRole("button", { name: "Submit" });

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    const selectedLabels = [
      tileLabel(0, 0),
      tileLabel(0, 1),
      tileLabel(0, 2),
      tileLabel(0, 3),
    ];

    for (const label of selectedLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    expect((submitButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: selectedLabels[0] }));

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("preserves selection when the board is shuffled", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const label = tileLabel(0, 0);
    const tile = screen.getByRole("button", { name: label });

    fireEvent.click(tile);
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(
      screen.getByRole("button", { name: label }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("renders the initial puzzle in a scrambled order", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const originalOrder = testConnectionsPuzzle.groups.flatMap((group) =>
      group.tiles.map((tile) => tile.label),
    );

    const renderedOrder = screen
      .getAllByRole("button", { pressed: false })
      .map((button) => button.textContent);

    expect(renderedOrder).not.toEqual(originalOrder);
  });

  it("keeps an incorrect guess selected and shows feedback", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const incorrectLabels = [
      tileLabel(0, 0),
      tileLabel(0, 1),
      tileLabel(1, 0),
      tileLabel(1, 1),
    ];

    for (const label of incorrectLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Incorrect guess")).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 3")).toBeTruthy();
    expect(getReaction("incorrect")).toBeTruthy();

    for (const label of incorrectLabels) {
      const tile = screen.getByRole("button", { name: label });

      expect(tile.getAttribute("aria-pressed")).toBe("true");
      expect(tile.className).toContain("tile-shake");
    }

    fireEvent.click(screen.getByRole("button", { name: incorrectLabels[0] }));

    expect(screen.queryByText("Incorrect guess")).toBeNull();
    expect(getReaction("incorrect")).toBeTruthy();
  });

  it("does not consume another mistake for a duplicate guess", () => {
    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const incorrectLabels = [
      tileLabel(0, 0),
      tileLabel(0, 1),
      tileLabel(1, 0),
      tileLabel(1, 1),
    ];

    for (const label of incorrectLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    const submitButton = screen.getByRole("button", { name: "Submit" });

    fireEvent.click(submitButton);

    expect(screen.getByText("Mistakes remaining: 3")).toBeTruthy();

    fireEvent.click(submitButton);

    expect(screen.getByText("Already guessed")).toBeTruthy();
    expect(screen.getByText("Mistakes remaining: 3")).toBeTruthy();
    expect(getReaction("incorrect")).toBeNull();
  });

  it("shares incorrect reaction history between one-away and wrong guesses", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const oneAwayLabels = [
      tileLabel(0, 0),
      tileLabel(0, 1),
      tileLabel(0, 2),
      tileLabel(1, 0),
    ];

    submitTiles(oneAwayLabels);

    expect(screen.getByText("One away!")).toBeTruthy();
    expect(getReaction("incorrect")).toBeTruthy();
    expect(getReaction("correct")).toBeNull();

    const oneAwayReactionSrc = getReactionSrc("incorrect");

    for (const label of oneAwayLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    submitTiles([
      tileLabel(0, 0),
      tileLabel(1, 1),
      tileLabel(2, 2),
      tileLabel(3, 3),
    ]);

    expect(screen.getByText("Incorrect guess")).toBeTruthy();
    expect(getReactionSrc("incorrect")).not.toBe(oneAwayReactionSrc);
  });

  it("does not repeat correct reactions within one game", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const reactionSources: (string | null | undefined)[] = [];

    for (const group of testConnectionsPuzzle.groups.slice(0, 3)) {
      submitTiles(group.tiles.map((tile) => tile.label));
      reactionSources.push(getReactionSrc("correct"));

      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    expect(reactionSources.every(Boolean)).toBe(true);
    expect(new Set(reactionSources)).toHaveProperty("size", 3);
  });

  it("shows correct feedback before resolving a solved group", () => {
    vi.useFakeTimers();

    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const solvedGroup = testConnectionsPuzzle.groups[0]!;
    const solvedLabels = solvedGroup.tiles.map((tile) => tile.label);

    for (const label of solvedLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Correct!")).toBeTruthy();
    expect(getReaction("correct")).toBeTruthy();

    for (const label of solvedLabels) {
      const tile = screen.getByRole("button", { name: label });

      expect(tile.className).toContain("tile-correct");
    }

    expect(screen.queryByText(solvedGroup.category)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(solvedGroup.category)).toBeTruthy();
    expect(screen.queryByText("Correct!")).toBeNull();

    for (const label of solvedLabels) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(getReaction("correct")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(850);
    });

    expect(getReaction("correct")).toBeNull();
  });

  it("shows a distinct loss reaction and avoids it in the next game", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    const incorrectGuesses = [
      [tileLabel(0, 0), tileLabel(0, 1), tileLabel(1, 0), tileLabel(1, 1)],
      [tileLabel(0, 0), tileLabel(0, 2), tileLabel(1, 0), tileLabel(1, 2)],
      [tileLabel(0, 1), tileLabel(0, 3), tileLabel(2, 0), tileLabel(2, 1)],
      [tileLabel(1, 1), tileLabel(1, 3), tileLabel(3, 0), tileLabel(3, 1)],
    ];

    function loseGame() {
      let previousGuess: string[] = [];

      for (const guess of incorrectGuesses) {
        for (const label of previousGuess) {
          fireEvent.click(screen.getByRole("button", { name: label }));
        }

        submitTiles(guess);
        previousGuess = guess;
      }
    }

    loseGame();

    expect(screen.getByText("Game over")).toBeTruthy();
    expect(getReaction("loss")).toBeTruthy();
    expect(getReaction("incorrect")).toBeNull();

    const firstLossSrc = getReactionSrc("loss");

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(getReaction("loss")).toBeNull();
    expect(screen.getByText("Mistakes remaining: 4")).toBeTruthy();

    loseGame();

    expect(screen.getByText("Game over")).toBeTruthy();
    expect(getReactionSrc("loss")).toBeTruthy();
    expect(getReactionSrc("loss")).not.toBe(firstLossSrc);
  });

  it("shows a win reaction after the final correct guess and clears it on restart", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<ConnectionsGameBoard puzzle={testConnectionsPuzzle} />);

    for (const group of testConnectionsPuzzle.groups) {
      submitTiles(group.tiles.map((tile) => tile.label));

      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    expect(screen.getByText("Puzzle complete!")).toBeTruthy();
    expect(getReaction("win")).toBeTruthy();
    expect(getReaction("correct")).toBeNull();

    const firstWinSrc = getReactionSrc("win");

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(getReaction("win")).toBeNull();
    expect(screen.getByText("Mistakes remaining: 4")).toBeTruthy();

    for (const group of testConnectionsPuzzle.groups) {
      submitTiles(group.tiles.map((tile) => tile.label));

      act(() => {
        vi.advanceTimersByTime(300);
      });
    }

    const secondWinSrc = getReactionSrc("win");

    expect(firstWinSrc).toBeTruthy();
    expect(secondWinSrc).toBeTruthy();
    expect(secondWinSrc).not.toBe(firstWinSrc);
  });
});
