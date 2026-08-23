import { expect, test, type Page } from "@playwright/test";

import { developmentConnectionsPuzzle } from "../fixtures/connections";

const connectionsPuzzlePath = `/games/connections/${developmentConnectionsPuzzle.id}`;

function waitForPlayerBootstrap(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/player/bootstrap") &&
      response.request().method() === "POST",
  );
}

async function expectConnectionsGameToBeUsable(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByRole("button", { name: "Shuffle" })).toBeEnabled();
}

test("anonymous Player bootstrap succeeds and remains reusable after reload", async ({
  page,
}) => {
  const initialBootstrap = waitForPlayerBootstrap(page);

  await page.goto(connectionsPuzzlePath);

  expect((await initialBootstrap).status()).toBe(204);
  await expectConnectionsGameToBeUsable(page);

  const reloadedBootstrap = waitForPlayerBootstrap(page);

  await page.reload();

  expect((await reloadedBootstrap).status()).toBe(204);
  await expectConnectionsGameToBeUsable(page);
});
