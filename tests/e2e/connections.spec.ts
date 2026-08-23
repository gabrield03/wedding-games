import { expect, test, type Page, type Response } from "@playwright/test";

import { developmentConnectionsPuzzle } from "../fixtures/connections";

const puzzle = developmentConnectionsPuzzle;
const connectionsPuzzlePath = `/games/connections/${puzzle.id}`;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const internalSolutionIds = puzzle.groups.flatMap((group) => [
  group.id,
  ...group.tiles.map((tile) => tile.id),
]);
const groupTiers = ["yellow", "green", "blue", "purple"] as const;

type AttemptSnapshot = {
  attemptId: string;
  version: number;
  remainingTiles: Array<{ id: string; label: string }>;
  displayedGroups: Array<{
    category: string;
    tier: (typeof groupTiers)[number];
    tiles: Array<{ id: string; label: string }>;
  }>;
  mistakesRemaining: number;
  gameStatus: "playing" | "won" | "lost";
};

type AttemptPayload = { attempt: AttemptSnapshot };
type GuessPayload = {
  outcome: "correct" | "incorrect" | "one_away" | "duplicate";
  attempt: AttemptSnapshot;
};

test("initial render and Attempt payload do not expose the unrevealed solution", async ({
  page,
}) => {
  const renderPayloads = captureInitialRenderPayloads(page);
  const initialAttemptResponse = waitForAttemptResponse(page);

  await page.goto(connectionsPuzzlePath);
  const attemptPayload = await readAttemptPayload(await initialAttemptResponse);

  await expectConnectionsGameToBeUsable(page);
  expectInitialSnapshot(attemptPayload.attempt);

  const browserRenderPayload = (await Promise.all(renderPayloads)).join("\n");
  expect(renderPayloads.length).toBeGreaterThan(0);
  expect(browserRenderPayload).toContain(puzzle.title);

  for (const marker of [
    ...puzzle.groups.map((group) => group.category),
    ...internalSolutionIds,
  ]) {
    expect(browserRenderPayload).not.toContain(marker);
  }
});

test("player can complete without the Connections board shifting, refresh, and authoritatively replay", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(connectionsPuzzlePath);
  const initialAttempt = (
    await readAttemptPayload(await initialAttemptResponse)
  ).attempt;

  await expectConnectionsGameToBeUsable(page);
  const initialBoardBox = await page
    .locator("[data-connections-board]")
    .boundingBox();
  expect(initialBoardBox).not.toBeNull();

  for (const [index, group] of puzzle.groups.entries()) {
    await selectTiles(
      page,
      group.tiles.map((tile) => tile.label),
    );

    const guessResponse = waitForGuessResponse(page, initialAttempt.attemptId);
    await page.getByRole("button", { name: "Submit" }).click();
    const payload = await readGuessPayload(await guessResponse);

    expect(payload.outcome).toBe("correct");
    expect(payload.attempt.displayedGroups).toHaveLength(index + 1);
    expect(payload.attempt.displayedGroups[index]).toMatchObject({
      category: group.category,
      tier: groupTiers[index],
    });
    expectNoInternalSolutionIds(payload);
    await expect(page.getByText(group.category, { exact: true })).toBeVisible();

    const solvedGroup = page.locator(
      `[data-connections-group-tier="${groupTiers[index]}"]`,
    );
    await expect(solvedGroup).toBeVisible();
    const boardBox = await page
      .locator("[data-connections-board]")
      .boundingBox();
    expect(boardBox).not.toBeNull();
    expect(
      Math.abs(boardBox!.height - initialBoardBox!.height),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(boardBox!.width - initialBoardBox!.width),
    ).toBeLessThanOrEqual(1);
  }

  await expect(page.getByText("Puzzle complete!")).toBeVisible();
  await expect(page.locator('[data-connections-reaction="win"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();

  const completedResumeResponse = waitForAttemptResponse(page);
  await page.reload();
  const completedResume = (
    await readAttemptPayload(await completedResumeResponse)
  ).attempt;

  expect(completedResume.attemptId).toBe(initialAttempt.attemptId);
  expect(completedResume.gameStatus).toBe("won");
  expect(completedResume.displayedGroups).toHaveLength(4);
  expectNoInternalSolutionIds(completedResume);
  await expect(page.getByText("Puzzle complete!")).toBeVisible();

  const replayResponse = waitForAttemptResponse(page);
  await page.getByRole("button", { name: "Play Again" }).click();
  const replay = (await readAttemptPayload(await replayResponse)).attempt;

  expect(replay.attemptId).not.toBe(initialAttempt.attemptId);
  expectInitialSnapshot(replay);
  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByText("Mistakes remaining: 4")).toBeVisible();
  await expect(page.locator('[data-connections-reaction="win"]')).toHaveCount(
    0,
  );
});

test("player can resume an active game, lose, and authoritatively replay", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(connectionsPuzzlePath);
  const initialAttempt = (
    await readAttemptPayload(await initialAttemptResponse)
  ).attempt;

  await expectConnectionsGameToBeUsable(page);
  const [firstGroup, secondGroup, thirdGroup] = puzzle.groups;
  const oneAwayGuess = [
    ...firstGroup.tiles.slice(0, 3).map((tile) => tile.label),
    secondGroup.tiles[0].label,
  ];

  await selectTiles(page, oneAwayGuess);
  const oneAwayResponse = waitForGuessResponse(page, initialAttempt.attemptId);
  await page.getByRole("button", { name: "Submit" }).click();
  const oneAway = await readGuessPayload(await oneAwayResponse);

  expect(oneAway.outcome).toBe("one_away");
  expect(oneAway.attempt.displayedGroups).toEqual([]);
  expectNoInternalSolutionIds(oneAway);
  await expect(page.getByText("One away!", { exact: true })).toBeVisible();

  const activeResumeResponse = waitForAttemptResponse(page);
  await page.reload();
  const activeResume = (await readAttemptPayload(await activeResumeResponse))
    .attempt;

  expect(activeResume).toMatchObject({
    attemptId: initialAttempt.attemptId,
    version: oneAway.attempt.version,
    mistakesRemaining: 3,
    gameStatus: "playing",
    displayedGroups: [],
  });
  expectNoInternalSolutionIds(activeResume);
  await expect(page.getByText("Mistakes remaining: 3")).toBeVisible();

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
  ];

  for (const [index, labels] of incorrectGuesses.entries()) {
    await clearSelection(page);
    await selectTiles(page, labels);

    const guessResponse = waitForGuessResponse(page, initialAttempt.attemptId);
    await page.getByRole("button", { name: "Submit" }).click();
    const payload = await readGuessPayload(await guessResponse);

    expect(payload.outcome).toBe("incorrect");
    expectNoInternalSolutionIds(payload);

    if (index < incorrectGuesses.length - 1) {
      expect(payload.attempt.displayedGroups).toEqual([]);
      await expect(
        page.getByText(`Mistakes remaining: ${2 - index}`),
      ).toBeVisible();
    } else {
      expect(payload.attempt.gameStatus).toBe("lost");
      expect(payload.attempt.displayedGroups).toHaveLength(4);
      expect(
        payload.attempt.displayedGroups.map((group) => group.tier),
      ).toEqual(groupTiers);
    }
  }

  await expect(page.getByText("Game over")).toBeVisible();
  await expect(
    page.locator('[data-connections-reaction="loss"]'),
  ).toBeVisible();

  for (const group of puzzle.groups) {
    await expect(page.getByText(group.category, { exact: true })).toBeVisible();
  }

  const replayResponse = waitForAttemptResponse(page);
  await page.getByRole("button", { name: "Play Again" }).click();
  const replay = (await readAttemptPayload(await replayResponse)).attempt;

  expect(replay.attemptId).not.toBe(initialAttempt.attemptId);
  expectInitialSnapshot(replay);
  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByText("Mistakes remaining: 4")).toBeVisible();
  await expect(page.locator('[data-connections-reaction="loss"]')).toHaveCount(
    0,
  );
});

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

async function expectConnectionsGameToBeUsable(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  await expect(page.getByText(puzzle.title, { exact: true })).toHaveCount(0);
  await expect(page.locator("button[aria-pressed]")).toHaveCount(16);
  await expect(page.getByRole("button", { name: "Shuffle" })).toBeEnabled();
}

function waitForAttemptResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/games/connections/attempts" &&
      response.request().method() === "POST"
    );
  });
}

function waitForGuessResponse(page: Page, attemptId: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === `/api/games/connections/attempts/${attemptId}/guesses` &&
      response.request().method() === "POST"
    );
  });
}

function captureInitialRenderPayloads(page: Page) {
  const payloads: Array<Promise<string>> = [];

  page.on("response", (response) => {
    const url = new URL(response.url());
    const contentType = response.headers()["content-type"] ?? "";
    const isRenderPayload =
      response.request().resourceType() === "document" ||
      contentType.includes("text/x-component");

    if (url.pathname === connectionsPuzzlePath && isRenderPayload) {
      payloads.push(response.text());
    }
  });

  return payloads;
}

async function readAttemptPayload(response: Response) {
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as AttemptPayload;

  expect(Object.keys(payload).sort()).toEqual(["attempt"]);
  expectSnapshotShape(payload.attempt);
  return payload;
}

async function readGuessPayload(response: Response) {
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as GuessPayload;

  expect(Object.keys(payload).sort()).toEqual(["attempt", "outcome"]);
  expectSnapshotShape(payload.attempt);
  return payload;
}

function expectInitialSnapshot(attempt: AttemptSnapshot) {
  expectSnapshotShape(attempt);
  expect(attempt).toMatchObject({
    version: 0,
    displayedGroups: [],
    mistakesRemaining: 4,
    gameStatus: "playing",
  });
  expect(attempt.remainingTiles).toHaveLength(16);
  expect(new Set(attempt.remainingTiles.map((tile) => tile.id)).size).toBe(16);
  expect(new Set(attempt.remainingTiles.map((tile) => tile.label))).toEqual(
    new Set(
      puzzle.groups.flatMap((group) => group.tiles.map((tile) => tile.label)),
    ),
  );
  expectNoInternalSolutionIds(attempt);
}

function expectSnapshotShape(attempt: AttemptSnapshot) {
  expect(Object.keys(attempt).sort()).toEqual(
    [
      "attemptId",
      "displayedGroups",
      "gameStatus",
      "mistakesRemaining",
      "remainingTiles",
      "version",
    ].sort(),
  );
  expect(attempt.attemptId).toMatch(uuidPattern);

  for (const tile of [
    ...attempt.remainingTiles,
    ...attempt.displayedGroups.flatMap((group) => group.tiles),
  ]) {
    expect(Object.keys(tile).sort()).toEqual(["id", "label"]);
    expect(tile.id).toMatch(uuidPattern);
  }

  for (const group of attempt.displayedGroups) {
    expect(Object.keys(group).sort()).toEqual(["category", "tier", "tiles"]);
    expect(groupTiers).toContain(group.tier);
  }
}

function expectNoInternalSolutionIds(value: unknown) {
  const serialized = JSON.stringify(value);

  for (const internalId of internalSolutionIds) {
    expect(serialized).not.toContain(internalId);
  }
}
