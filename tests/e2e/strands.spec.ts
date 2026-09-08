import { expect, test, type Page, type Response } from "@playwright/test";

const strandsEntryPath = "/games/strands";
const strandsPuzzlePath = "/games/strands/wedding-01";
const sushiPuzzlePath = "/games/strands/wedding-04";
const newOrleansPuzzlePath = "/games/strands/wedding-05";
const weddingAnswers = [
  { word: "CEREMONY", kind: "theme", path: [0, 1, 7, 6, 12, 13, 14, 19] },
  { word: "RECEPTION", kind: "theme", path: [3, 4, 5, 11, 10, 9, 16, 17, 23] },
  { word: "BOUQUET", kind: "theme", path: [18, 24, 25, 30, 31, 36, 37] },
  { word: "GUESTS", kind: "theme", path: [22, 28, 27, 34, 35, 29] },
  { word: "VOWS", kind: "theme", path: [42, 43, 44, 45] },
  { word: "VEIL", kind: "theme", path: [33, 40, 41, 47] },
  {
    word: "WEDDINGDAY",
    kind: "spangram",
    path: [2, 8, 15, 20, 21, 26, 32, 38, 39, 46],
  },
] as const;

type RevealedAnswer =
  | {
      word: string;
      kind: "theme";
      path: number[];
      themeIndex: number;
    }
  | {
      word: string;
      kind: "spangram";
      path: number[];
    };

type AttemptSnapshot = {
  attemptId: string;
  version: number;
  puzzle: {
    id: string;
    themeClue: string;
    grid: {
      rows: number;
      columns: number;
      letters: string;
    };
    answerCount: number;
  };
  foundAnswers: RevealedAnswer[];
  hintedTileIndexes: number[] | null;
  gameStatus: "playing" | "complete";
};

type AttemptPayload = { attempt: AttemptSnapshot };
type PathPayload = {
  outcome:
    | "found_theme"
    | "found_spangram"
    | "already_found"
    | "not_theme"
    | "invalid_path"
    | "game_complete";
  attempt: AttemptSnapshot;
};

test("initial render and Attempt payload keep unrevealed Strands answers server-side", async ({
  page,
}) => {
  const renderPayloads = captureInitialRenderPayloads(page, strandsPuzzlePath);
  const attemptResponse = waitForAttemptResponse(page);

  await page.goto(strandsPuzzlePath);
  const payload = await readAttemptPayload(await attemptResponse);
  await expectStrandsToBeUsable(page);

  expect(payload.attempt).toMatchObject({
    version: 0,
    foundAnswers: [],
    hintedTileIndexes: null,
    gameStatus: "playing",
  });
  expect(payload.attempt.puzzle).toEqual({
    id: "wedding-01",
    themeClue: "The Big Day",
    grid: {
      rows: 8,
      columns: 6,
      letters: "CEWRECERETPEMONDIOBYDIGNOUNEUSQUGVSTETDAEIVOWSYL",
    },
    answerCount: 7,
  });

  const renderPayload = (await Promise.all(renderPayloads)).join("\n");
  expect(renderPayloads.length).toBeGreaterThan(0);
  expect(renderPayload).toContain("The Big Day");
  expect(renderPayload).not.toContain('"themeWords"');
  expect(renderPayload).not.toContain('"spangram"');
});

test("server-selected Strands hints remain stable and resume after refresh", async ({
  page,
}) => {
  const attemptResponse = waitForAttemptResponse(page);
  await page.goto(strandsPuzzlePath);
  const initial = (await readAttemptPayload(await attemptResponse)).attempt;
  await expectStrandsToBeUsable(page);

  const firstHintResponse = waitForHintResponse(page, initial.attemptId);
  await page.getByRole("button", { name: "Hint" }).click();
  const firstHint = (await readAttemptPayload(await firstHintResponse)).attempt;

  expect(firstHint.version).toBe(1);
  expect(firstHint.hintedTileIndexes).not.toBeNull();
  expect(firstHint.hintedTileIndexes!.length).toBeGreaterThanOrEqual(4);
  expect(JSON.stringify(firstHint)).not.toContain("active_hint_word");

  const hintedTiles = page.locator('[data-strands-hinted="true"]');
  await expect(hintedTiles).toHaveCount(firstHint.hintedTileIndexes!.length);

  const secondHintResponse = waitForHintResponse(page, initial.attemptId);
  await page.getByRole("button", { name: "Hint" }).click();
  const repeated = (await readAttemptPayload(await secondHintResponse)).attempt;

  expect(repeated.version).toBe(firstHint.version);
  expect(repeated.hintedTileIndexes).toEqual(firstHint.hintedTileIndexes);

  const resumeResponse = waitForAttemptResponse(page);
  await page.reload();
  const resumed = (await readAttemptPayload(await resumeResponse)).attempt;

  expect(resumed.attemptId).toBe(initial.attemptId);
  expect(resumed.version).toBe(firstHint.version);
  expect(resumed.hintedTileIndexes).toEqual(firstHint.hintedTileIndexes);
  await expect(hintedTiles).toHaveCount(firstHint.hintedTileIndexes!.length);
});

test("Strands persists found answers on the server but not partial selections", async ({
  page,
}) => {
  const attemptResponse = waitForAttemptResponse(page);
  await page.goto(strandsPuzzlePath);
  const initial = (await readAttemptPayload(await attemptResponse)).attempt;
  await expectStrandsToBeUsable(page);

  const firstAnswer = weddingAnswers[0];
  const pathResponse = waitForPathResponse(page, initial.attemptId);
  await selectAndSubmitPath(page, firstAnswer.path);
  const progressed = await readPathPayload(await pathResponse);

  expect(progressed.outcome).toBe("found_theme");
  expect(progressed.attempt.version).toBe(1);
  expect(progressed.attempt.foundAnswers).toEqual([
    {
      word: firstAnswer.word,
      kind: "theme",
      path: firstAnswer.path,
      themeIndex: 0,
    },
  ]);
  await expect(page.getByText("Found 1 of 7")).toBeVisible();

  await selectTiles(page, [3, 4]);
  await expect(page.getByRole("status")).toContainText("Selected word:");

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL("/games/strands/wedding-02");

  const resumeResponse = waitForAttemptResponse(page);
  await page.goto(strandsPuzzlePath);
  const resumed = (await readAttemptPayload(await resumeResponse)).attempt;

  expect(resumed.attemptId).toBe(initial.attemptId);
  expect(resumed.version).toBe(1);
  expect(resumed.foundAnswers).toEqual(progressed.attempt.foundAnswers);
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

test("Strands completion and Play Again create a fresh authoritative Attempt", async ({
  page,
}) => {
  const attemptResponse = waitForAttemptResponse(page);
  await page.goto(strandsPuzzlePath);
  const initial = (await readAttemptPayload(await attemptResponse)).attempt;
  await expectStrandsToBeUsable(page);

  let latest = initial;

  for (const [index, answer] of weddingAnswers.entries()) {
    const pathResponse = waitForPathResponse(page, initial.attemptId);
    await selectAndSubmitPath(page, [...answer.path]);
    const payload = await readPathPayload(await pathResponse);

    latest = payload.attempt;
    expect(latest.version).toBe(index + 1);
    expect(latest.foundAnswers).toHaveLength(index + 1);
  }

  expect(latest.gameStatus).toBe("complete");
  await expect(page.getByText("Puzzle complete!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();

  const replayResponse = waitForAttemptResponse(page);
  await page.getByRole("button", { name: "Play Again" }).click();
  const replay = (await readAttemptPayload(await replayResponse)).attempt;

  expect(replay.attemptId).not.toBe(initial.attemptId);
  expect(replay).toMatchObject({
    version: 0,
    foundAnswers: [],
    hintedTileIndexes: null,
    gameStatus: "playing",
  });
  await expect(page.getByText("Found 0 of 7")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();
});

test("Strands entry remembers only the last visited puzzle", async ({ page }) => {
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

  await playStrandsLink.click();

  await expect(page).toHaveURL(newOrleansPuzzlePath, { timeout: 15_000 });
  await expect(page.getByText("Where it all started")).toBeVisible();
});

test("Next Puzzle enters New Orleans and wraps back to the first puzzle", async ({
  page,
}) => {
  await page.goto(sushiPuzzlePath);
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL(newOrleansPuzzlePath);
  await expect(page.getByText("Where it all started")).toBeVisible();

  await page.getByRole("link", { name: "Next Puzzle" }).click();
  await expect(page).toHaveURL(strandsPuzzlePath);
  await expect(page.getByText("The Big Day")).toBeVisible();
});

async function selectAndSubmitPath(page: Page, path: readonly number[]) {
  await selectTiles(page, path);
  await page.getByRole("button", { name: "Submit" }).click();
}

async function selectTiles(page: Page, path: readonly number[]) {
  for (const tileIndex of path) {
    await page
      .locator('[data-strands-tile="' + tileIndex + '"]')
      .click();
  }
}

async function expectStrandsToBeUsable(page: Page) {
  await expect(page.getByRole("heading", { name: "Strands" })).toBeVisible();
  await expect(
    page.getByRole("grid", { name: "Strands letter grid" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Hint" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();
}

function waitForAttemptResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/games/strands/attempts" &&
      response.request().method() === "POST"
    );
  });
}

function waitForPathResponse(page: Page, attemptId: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname ===
        "/api/games/strands/attempts/" + attemptId + "/paths" &&
      response.request().method() === "POST"
    );
  });
}

function waitForHintResponse(page: Page, attemptId: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname ===
        "/api/games/strands/attempts/" + attemptId + "/hints" &&
      response.request().method() === "POST"
    );
  });
}

function captureInitialRenderPayloads(page: Page, pathname: string) {
  const payloads: Array<Promise<string>> = [];

  page.on("response", (response) => {
    const url = new URL(response.url());
    const contentType = response.headers()["content-type"] ?? "";
    const isRenderPayload =
      response.request().resourceType() === "document" ||
      contentType.includes("text/x-component");

    if (url.pathname === pathname && isRenderPayload) {
      payloads.push(response.text());
    }
  });

  return payloads;
}

async function readAttemptPayload(response: Response) {
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as AttemptPayload;

  expect(Object.keys(payload)).toEqual(["attempt"]);
  expectSnapshotShape(payload.attempt);
  return payload;
}

async function readPathPayload(response: Response) {
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as PathPayload;

  expect(Object.keys(payload).sort()).toEqual(["attempt", "outcome"]);
  expectSnapshotShape(payload.attempt);
  return payload;
}

function expectSnapshotShape(attempt: AttemptSnapshot) {
  expect(Object.keys(attempt).sort()).toEqual(
    [
      "attemptId",
      "foundAnswers",
      "gameStatus",
      "hintedTileIndexes",
      "puzzle",
      "version",
    ].sort(),
  );
  expect(Object.keys(attempt.puzzle).sort()).toEqual(
    ["answerCount", "grid", "id", "themeClue"].sort(),
  );
  expect(attempt).not.toHaveProperty("themeWords");
  expect(attempt).not.toHaveProperty("spangram");

  for (const answer of attempt.foundAnswers) {
    if (answer.kind === "theme") {
      expect(Object.keys(answer).sort()).toEqual(
        ["kind", "path", "themeIndex", "word"].sort(),
      );
    } else {
      expect(Object.keys(answer).sort()).toEqual(["kind", "path", "word"]);
    }
  }
}
