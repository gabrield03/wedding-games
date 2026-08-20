import { expect, test, type Page } from "@playwright/test";

import { wedding01WordlePuzzle } from "../fixtures/wordle";

const wordlePuzzleId = wedding01WordlePuzzle.id;
const wordlePuzzlePath = `/games/wordle/${wordlePuzzleId}`;
const wordlePuzzlePathPattern = /\/games\/wordle\/wedding-(?:0[1-9]|10)$/;

async function enterGuess(page: Page, guess: string) {
  for (const letter of guess) {
    await page
      .getByRole("button", {
        name: new RegExp(`^${letter}(?:, (?:correct|present|absent))?$`),
      })
      .click();
  }

  await expect(
    page.getByRole("group", { name: `Current guess: ${guess}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter" }).click();
}

async function navigateToNextWord(page: Page) {
  const nextWordLink = page.getByRole("link", { name: "Next Word" });

  await expect(nextWordLink).toHaveAttribute(
    "href",
    `/games/wordle?exclude=${wordlePuzzleId}`,
  );
  await nextWordLink.click();
  await page.waitForURL(
    (url) =>
      url.pathname !== wordlePuzzlePath &&
      wordlePuzzlePathPattern.test(url.pathname),
  );

  const nextPuzzleId = new URL(page.url()).pathname.split("/").at(-1);

  expect(nextPuzzleId).not.toBe(wordlePuzzleId);
}

test("player can win a puzzle and navigate to a fresh next word", async ({
  page,
}) => {
  const puzzle = wedding01WordlePuzzle;

  await page.goto(wordlePuzzlePath);
  await enterGuess(page, puzzle.answer);

  await expect(page.getByRole("status")).toHaveText("You got it!");
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "On-screen keyboard" }),
  ).toBeVisible();

  await navigateToNextWord(page);
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(
    page.getByRole("group", { name: "Current guess is empty" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeEnabled();
});

test("player can lose a puzzle, see the answer, and navigate to a fresh next word", async ({
  page,
}) => {
  const puzzle = wedding01WordlePuzzle;
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

  await navigateToNextWord(page);
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(
    page.getByRole("group", { name: "Current guess is empty" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeEnabled();
});
