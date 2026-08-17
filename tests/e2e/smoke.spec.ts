import { expect, test } from "@playwright/test";

import { developmentPuzzle } from "../../src/content/connections/developmentPuzzle";

const connectionsPuzzlePath = `/games/connections/${developmentPuzzle.id}`;

test("player can navigate from the home page to Connections", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Wedding Games/);
  await expect(
    page.getByRole("heading", { name: "Wedding Games" }),
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

test("unknown Connections puzzle returns not found", async ({ page }) => {
  const response = await page.goto("/games/connections/does-not-exist");

  expect(response?.status()).toBe(404);
});
