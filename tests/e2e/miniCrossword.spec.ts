import { expect, test } from "@playwright/test";

test("mobile Mini Crossword keeps a stable board width across clue lengths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/games/mini-crossword/wedding-01");

  const board = page.getByRole("grid", { name: "Mini Crossword board" });
  const clueNavigation = page.getByRole("group", {
    name: "Mini Crossword clue navigation",
  });

  await expect(board).toBeVisible();
  await expect(clueNavigation).toBeVisible();

  await page.locator('[data-mini-crossword-cell="2-0"]').click();
  await expect(clueNavigation).toContainText("5 Across");
  await expect(clueNavigation).toContainText("Tie the knot");

  const shortClueBounds = await board.boundingBox();

  await page.getByRole("button", { name: "Next clue" }).click();
  await expect(clueNavigation).toContainText("5 Down");
  await expect(clueNavigation).toContainText(
    "Popular month for spring weddings",
  );

  const longClueBounds = await board.boundingBox();

  expect(shortClueBounds).not.toBeNull();
  expect(longClueBounds).not.toBeNull();
  expect(Math.abs(longClueBounds!.width - shortClueBounds!.width)).toBeLessThan(
    1,
  );
});
