import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { developmentPuzzle } from "@/domain/connections/fixtures";
import { ConnectionsGameBoard } from "@/features/connections/ConnectionsGameBoard";

afterEach(() => {
  cleanup();
});

describe("ConnectionsGameBoard", () => {
  it("renders all 16 puzzle tiles", () => {
    render(<ConnectionsGameBoard puzzle={developmentPuzzle} />);

    const tileButtons = screen.getAllByRole("button", {
      pressed: false,
    });

    expect(tileButtons).toHaveLength(16);
  });

  it("selects and deselects a tile", () => {
    render(<ConnectionsGameBoard puzzle={developmentPuzzle} />);

    const tile = screen.getByRole("button", { name: "A" });

    fireEvent.click(tile);

    expect(tile.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(tile);

    expect(tile.getAttribute("aria-pressed")).toBe("false");
  });

  it("allows at most four tiles to be selected", () => {
    render(<ConnectionsGameBoard puzzle={developmentPuzzle} />);

    const tileLabels = ["A", "B", "C", "D", "1"];

    for (const label of tileLabels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    expect(
      screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "B" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "C" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "D" }).getAttribute("aria-pressed"),
    ).toBe("true");

    expect(
      screen.getByRole("button", { name: "1" }).getAttribute("aria-pressed"),
    ).toBe("false");

    expect(screen.getByText("4 / 4 selected")).toBeTruthy();
  });

  it("enables Submit only when exactly four tiles are selected", () => {
    render(<ConnectionsGameBoard puzzle={developmentPuzzle} />);

    const submitButton = screen.getByRole("button", { name: "Submit" });

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    for (const label of ["A", "B", "C", "D"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    expect((submitButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "A" }));

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("preserves selection when the board is shuffled", () => {
    render(<ConnectionsGameBoard puzzle={developmentPuzzle} />);

    const tile = screen.getByRole("button", { name: "A" });

    fireEvent.click(tile);
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(
      screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
