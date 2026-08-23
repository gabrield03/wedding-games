import { expect, test, type Page } from "@playwright/test";

const wordlePuzzlePath = "/games/wordle/wedding-01";

test("Wordle keeps a compact board and wider keyboard at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openWordle(page);

  const board = page.locator("[data-wordle-board]");
  const keyboard = page.locator("[data-wordle-keyboard]");
  const [boardBox, keyboardBox] = await Promise.all([
    board.boundingBox(),
    keyboard.boundingBox(),
  ]);

  expect(boardBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();

  expect(boardBox!.width).toBeLessThan(300);
  expect(keyboardBox!.width).toBeGreaterThan(boardBox!.width);

  const visibleKeyboardHeight = Math.max(
    0,
    Math.min(keyboardBox!.y + keyboardBox!.height, 800) -
      Math.max(keyboardBox!.y, 0),
  );
  expect(visibleKeyboardHeight / keyboardBox!.height).toBeGreaterThan(0.5);

  const horizontalMetrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(horizontalMetrics.documentWidth).toBeLessThanOrEqual(
    horizontalMetrics.viewportWidth,
  );
});

test("Wordle grows the board on desktop while keeping the keyboard wider", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openWordle(page);

  const board = page.locator("[data-wordle-board]");
  const keyboard = page.locator("[data-wordle-keyboard]");
  const [boardBox, keyboardBox] = await Promise.all([
    board.boundingBox(),
    keyboard.boundingBox(),
  ]);

  expect(boardBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();

  expect(boardBox!.width).toBeGreaterThan(400);
  expect(keyboardBox!.width).toBeGreaterThan(boardBox!.width + 100);
  expect(keyboardBox!.width).toBeLessThanOrEqual(641);
});

async function openWordle(page: Page) {
  const attemptResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/games/wordle/attempts" &&
      response.request().method() === "POST"
    );
  });

  await page.goto(wordlePuzzlePath);
  expect((await attemptResponse).ok()).toBe(true);
  await expect(page.locator("[data-wordle-board]")).toBeVisible();
  await expect(page.locator("[data-wordle-keyboard]")).toBeVisible();
}
