import { expect, test } from "@playwright/test";

import { developmentConnectionsPuzzle } from "../fixtures/connections";
import { wedding01WordlePuzzle } from "../fixtures/wordle";

const connectionsPuzzleId = developmentConnectionsPuzzle.id;
const connectionsPuzzlePath = `/games/connections/${connectionsPuzzleId}`;
const directWordlePuzzlePath = `/games/wordle/${wedding01WordlePuzzle.id}`;
const wordlePuzzlePathPattern = /\/games\/wordle\/wedding-(?:0[1-9]|10)$/;

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
    page.getByRole("heading", { name: "Connections" }),
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

  const playWordleLink = page.getByRole("link", {
    name: "Play Wordle",
    exact: true,
  });

  await expect(playWordleLink).toHaveAttribute("href", "/games/wordle");
  await playWordleLink.click();

  await expect(page).toHaveURL(wordlePuzzlePathPattern);
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

test("direct Wordle puzzle URL remains playable", async ({ page }) => {
  await page.goto(directWordlePuzzlePath);

  await expect(page).toHaveURL(directWordlePuzzlePath);
  await expect(page.getByRole("heading", { name: "Wordle" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Current guess is empty" }),
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
