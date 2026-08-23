import { expect, test } from "@playwright/test";

const strandsPuzzlePath = "/games/strands/wedding-01";

test("player can request a Strands hint without solving the answer", async ({
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
});
