import { expect, test, type Page } from "@playwright/test";

import { developmentPuzzle } from "../../src/content/connections/developmentPuzzle";

async function selectTiles(page: Page, labels: string[]) {
  for (const label of labels) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
}

async function clearSelection(page: Page) {
  const selectedTiles = page.locator('button[aria-pressed="true"]');

  while ((await selectedTiles.count()) > 0) {
    await selectedTiles.first().click();
  }
}

test("player can complete and restart a puzzle", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: developmentPuzzle.title }),
  ).toBeVisible();

  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);

  for (const group of developmentPuzzle.groups) {
    await selectTiles(
      page,
      group.tiles.map((tile) => tile.label),
    );

    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText(group.category, { exact: true })).toBeVisible();
  }

  await expect(page.getByText("Puzzle complete!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();

  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByText("Mistakes remaining: 4")).toBeVisible();
});

test("player can lose and restart a puzzle", async ({ page }) => {
  await page.goto("/");

  const [firstGroup, secondGroup, thirdGroup, fourthGroup] =
    developmentPuzzle.groups;

  const incorrectGuesses = [
    [
      firstGroup.tiles[0].label,
      firstGroup.tiles[1].label,
      secondGroup.tiles[0].label,
      secondGroup.tiles[1].label,
    ],
    [
      firstGroup.tiles[0].label,
      firstGroup.tiles[2].label,
      secondGroup.tiles[0].label,
      secondGroup.tiles[2].label,
    ],
    [
      firstGroup.tiles[1].label,
      firstGroup.tiles[3].label,
      thirdGroup.tiles[0].label,
      thirdGroup.tiles[1].label,
    ],
    [
      secondGroup.tiles[1].label,
      secondGroup.tiles[3].label,
      fourthGroup.tiles[0].label,
      fourthGroup.tiles[1].label,
    ],
  ];

  for (let index = 0; index < incorrectGuesses.length; index++) {
    await clearSelection(page);
    await selectTiles(page, incorrectGuesses[index]);

    await page.getByRole("button", { name: "Submit" }).click();

    if (index < 3) {
      await expect(
        page.getByText(`Mistakes remaining: ${3 - index}`),
      ).toBeVisible();
    }
  }

  await expect(page.getByText("Game over")).toBeVisible();

  for (const group of developmentPuzzle.groups) {
    await expect(page.getByText(group.category, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();

  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByText("Mistakes remaining: 4")).toBeVisible();
});
