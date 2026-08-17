import { expect, test } from "@playwright/test";

import { developmentPuzzle } from "../../src/content/connections/developmentPuzzle";
import { featuredWordlePuzzleId } from "../../src/content/wordle/puzzles";

const connectionsPuzzlePath = `/games/connections/${developmentPuzzle.id}`;
const wordlePuzzlePath = `/games/wordle/${featuredWordlePuzzleId}`;

test("player can navigate from the home page to Connections", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Wedding Games/);
  await expect(
    page.getByRole("heading", { name: "Wedding Games" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Play Connections", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Play Wordle", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Play Connections", exact: true })
    .click();

  await expect(page).toHaveURL(connectionsPuzzlePath);
  await expect(
    page.getByRole("heading", { name: developmentPuzzle.title }),
  ).toBeVisible();

  const backLink = page.getByRole("link", {
    name: "Back to games",
    exact: true,
  });

  await expect(backLink).toBeVisible();
  await backLink.click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Wedding Games" }),
  ).toBeVisible();
});

test("player can navigate from the home page to Wordle", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Play Wordle", exact: true }).click();

  await expect(page).toHaveURL(wordlePuzzlePath);
  await expect(page.getByRole("heading", { name: "Wordle" })).toBeVisible();

  const backLink = page.getByRole("link", {
    name: "Back to games",
    exact: true,
  });

  await expect(backLink).toBeVisible();
  await backLink.click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Wedding Games" }),
  ).toBeVisible();
});

test("unknown Connections puzzle returns not found", async ({ page }) => {
  const response = await page.goto("/games/connections/does-not-exist");

  expect(response?.status()).toBe(404);
});

test("unknown Wordle puzzle returns not found", async ({ page }) => {
  const response = await page.goto("/games/wordle/does-not-exist");

  expect(response?.status()).toBe(404);
});
