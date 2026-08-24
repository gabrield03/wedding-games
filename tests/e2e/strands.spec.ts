import { expect, test } from "@playwright/test";

const strandsEntryPath = "/games/strands";
const strandsPuzzlePath = "/games/strands/wedding-01";
const sushiPuzzlePath = "/games/strands/wedding-04";
const newOrleansPuzzlePath = "/games/strands/wedding-05";
const firstWeddingThemePath = [0, 1, 7, 6, 12, 13, 14, 19];

test("player can request and restore a Strands hint without solving the answer", async ({
  page,
}) => {
  await page.goto(strandsPuzzlePath);

  await expect(page).toHaveURL(strandsPuzzlePath);
  await expect(page.getByRole("heading", { name: "Strands" })).toBeVisible();
  await expect(page.getByText("Found 0 of 7")).toBeVisible();

  const hintButton = page.getByRole("button", { name: "Hint" });
  const hintedTiles = page.locator('[data-strands-hinted="true"]');

  await expect(hintButton).toBeVisible();
  await expect(hintedTiles).toHaveCount(0);

  await hintButton.click();

  await expect(page.getByRole("status")).toContainText(
    "Hint highlighted on the board.",
  );
  await expect(page.getByText("Found 0 of 7")).toBeVisible();

  const hintedCount = await hintedTiles.count();
  expect(hintedCount).toBeGreaterThanOrEqual(4);

  for (let index = 0; index < hintedCount; index += 1) {
    await expect(hintedTiles.nth(index)).toHaveAttribute(
      "aria-label",
      /hinted/,
    );
  }

  await expect(page.locator("[data-strands-hint-path]")).toHaveCount(0);

  const firstHintedIndexes = await hintedTiles.evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute("data-strands-tile")),
  );

  await hintButton.click();

  await expect(hintedTiles).toHaveCount(hintedCount);
  await expect(page.getByText("Found 0 of 7")).toBeVisible();

  const repeatedHintedIndexes = await hintedTiles.evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute("data-strands-tile")),
  );

  expect(repeatedHintedIndexes).toEqual(firstHintedIndexes);

  await page.reload();
  await expect(page.getByText("Found 0 of 7")).toBeVisible();
  await expect(hintedTiles).toHaveCount(hintedCount);

  const restoredHintedIndexes = await hintedTiles.evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute("data-strands-tile")),
  );

  expect(restoredHintedIndexes).toEqual(firstHintedIndexes);
});

test("Strands entry starts on the first puzzle and later resumes the last visited puzzle", async ({
  page,
}) => {
  await page.goto(strandsEntryPath);
  await expect(page).toHaveURL(strandsPuzzlePath, { timeout: 15_000 });
  await expect(page.getByText("The Big Day")).toBeVisible();

  await page.goto(newOrleansPuzzlePath);
  await expect(page.getByText("Where it all started")).toBeVisible();

  await page.goto("/");
  const playStrandsLink = page.getByRole("link", {
    name: "Play Strands",
    exact: true,
  });

  await expect(playStrandsLink).toHaveAttribute("href", strandsEntryPath);
  await playStrandsLink.click();

  await expect(page).toHaveURL(newOrleansPuzzlePath, { timeout: 15_000 });
  await expect(page.getByText("Where it all started")).toBeVisible();
});

test("Strands restores durable progress but not a partial selection after navigation", async ({
  page,
}) => {
  await page.goto(strandsPuzzlePath);
  await expect(page.getByText("Found 0 of 7")).toBeVisible();

  await selectTiles(page, firstWeddingThemePath);
  await expect(page.getByText("Found 1 of 7")).toBeVisible();

  await selectTiles(page, [3, 4]);
  await expect(page.getByRole("status")).toContainText("Selected word:");

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL("/games/strands/wedding-02");

  await page.goto(strandsPuzzlePath);
  await expect(page.getByText("Found 1 of 7")).toBeVisible();
  await expect(page.getByText("Select adjacent letters.")).toBeVisible();
  await expect(page.locator('[data-strands-tile="3"]')).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(page.locator('[data-strands-tile="4"]')).toHaveAttribute(
    "aria-selected",
    "false",
  );
});

test("Next Puzzle enters New Orleans and wraps back to the first puzzle", async ({
  page,
}) => {
  await page.goto(sushiPuzzlePath);

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL(newOrleansPuzzlePath);
  await expect(page.getByText("Where it all started")).toBeVisible();

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL(strandsPuzzlePath);
  await expect(page.getByText("The Big Day")).toBeVisible();
});

async function selectTiles(
  page: import("@playwright/test").Page,
  path: number[],
) {
  for (const tileIndex of path) {
    await page.locator(`[data-strands-tile="${tileIndex}"]`).click();
  }
}
