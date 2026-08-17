import { expect, test, type Page } from "@playwright/test";

import { getWordlePuzzle } from "../../src/content/wordle/getWordlePuzzle";
import { featuredWordlePuzzleId } from "../../src/content/wordle/puzzles";

const wordlePuzzlePath = `/games/wordle/${featuredWordlePuzzleId}`;

async function loadFeaturedPuzzle() {
  const puzzle = await getWordlePuzzle(featuredWordlePuzzleId);

  if (!puzzle) {
    throw new Error(
      `Featured Wordle puzzle not found: ${featuredWordlePuzzleId}`,
    );
  }

  return puzzle;
}

async function enterGuess(page: Page, guess: string) {
  await page.keyboard.type(guess);
  await page.keyboard.press("Enter");
}

test("player can win the featured puzzle and play again", async ({ page }) => {
  const puzzle = await loadFeaturedPuzzle();

  await page.goto(wordlePuzzlePath);
  await enterGuess(page, puzzle.answer);

  await expect(page.getByRole("status")).toHaveText("You got it!");
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "On-screen keyboard" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();

  await expect(page.getByRole("status")).toBeEmpty();
  await expect(
    page.getByRole("group", { name: "Current guess is empty" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeEnabled();
});

test("player can lose the featured puzzle, see the answer, and play again", async ({
  page,
}) => {
  const puzzle = await loadFeaturedPuzzle();
  const losingGuess = puzzle.answer === "XXXXX" ? "ZZZZZ" : "XXXXX";

  await page.goto(wordlePuzzlePath);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await enterGuess(page, losingGuess);
  }

  await expect(page.getByRole("status")).toHaveText(
    `Game over. The answer was ${puzzle.answer}.`,
  );
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "On-screen keyboard" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();

  await expect(page.getByRole("status")).toBeEmpty();
  await expect(
    page.getByRole("group", { name: "Current guess is empty" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeEnabled();
});
