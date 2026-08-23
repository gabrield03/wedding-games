import { expect, test, type Page, type Response } from "@playwright/test";

import { wedding01WordlePuzzle } from "../fixtures/wordle";

const puzzle = wedding01WordlePuzzle;
const wordlePuzzlePath = `/games/wordle/${puzzle.id}`;
const wordlePuzzlePathPattern = /\/games\/wordle\/wedding-(?:0[1-9]|10)$/;
const validMiss = "CRANE";

type LetterStatus = "correct" | "present" | "absent";
type SubmittedGuess = {
  guess: string;
  evaluation: Array<{ letter: string; status: LetterStatus }>;
};
type AttemptSnapshot = {
  attemptId: string;
  version: number;
  submittedGuesses: SubmittedGuess[];
  gameStatus: "playing" | "won" | "lost";
  revealedAnswer?: string;
};
type AttemptPayload = { attempt: AttemptSnapshot };
type GameplayErrorPayload = {
  error: string;
  attempt?: AttemptSnapshot;
};

test("initial render and playing Attempt payloads do not expose the answer", async ({
  page,
}) => {
  const renderPayloads = captureInitialRenderPayloads(page, wordlePuzzlePath);
  const initialAttemptResponse = waitForAttemptResponse(page);

  await page.goto(wordlePuzzlePath);
  const initialResponse = await initialAttemptResponse;
  const initialPayload = await readAttemptPayload(initialResponse);
  await expectWordleToBeUsable(page);

  expect(initialResponse.request().postDataJSON()).toEqual({
    puzzleId: puzzle.id,
    startMode: "resume",
  });
  expectPlayingSnapshot(initialPayload.attempt, 0);

  const browserRenderPayload = (await Promise.all(renderPayloads)).join("\n");
  expect(renderPayloads.length).toBeGreaterThan(0);
  expect(browserRenderPayload).toContain("Wordle");
  expect(browserRenderPayload).not.toContain(puzzle.answer);
  expect(browserRenderPayload).not.toMatch(
    new RegExp(`revealedAnswer.{0,40}${puzzle.answer}`, "i"),
  );

  const guessResponse = waitForGuessResponse(
    page,
    initialPayload.attempt.attemptId,
  );
  await enterGuess(page, "RINGS");
  const playingPayload = await readAttemptPayload(await guessResponse);

  expectPlayingSnapshot(playingPayload.attempt, 1);
  expect(JSON.stringify(playingPayload)).not.toContain("revealedAnswer");
  expect(JSON.stringify(playingPayload)).not.toContain(puzzle.answer);
});

test("authoritative keyboard evaluations reveal after the submitted row", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const attempt = (await readAttemptPayload(await initialAttemptResponse))
    .attempt;
  await expectWordleToBeUsable(page);

  const presentResponse = waitForGuessResponse(page, attempt.attemptId);
  await enterGuess(page, "RINGS");
  await readAttemptPayload(await presentResponse);
  const presentR = page.getByRole("button", { name: "R, present" });
  await expect(presentR).toHaveClass(/bg-amber-500/);

  const correctResponse = waitForGuessResponse(page, attempt.attemptId);
  await enterGuess(page, validMiss);
  await readAttemptPayload(await correctResponse);
  const correctR = page.getByRole("button", { name: "R, correct" });
  await expect(correctR).toHaveClass(/bg-green-700/);
  await expect(page.getByRole("button", { name: "A, absent" })).toHaveClass(
    /bg-neutral-600/,
  );
});

test("invalid dictionary words do not consume an Attempt and remain editable", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const attempt = (await readAttemptPayload(await initialAttemptResponse))
    .attempt;
  await expectWordleToBeUsable(page);

  const invalidResponse = waitForGuessResponse(page, attempt.attemptId);
  await enterGuess(page, "QZXQZ");
  const response = await invalidResponse;
  expect(response.status()).toBe(422);
  const payload = (await response.json()) as GameplayErrorPayload;

  expect(payload.error).toBe("invalid_word");
  expect(payload.attempt).toEqual(attempt);
  expect(payload.attempt?.version).toBe(0);
  expect(payload.attempt?.submittedGuesses).toEqual([]);
  await expect(page.getByRole("status")).toHaveText("Not in word list.");
  await expect(
    page.getByRole("group", { name: "Current guess: QZXQZ" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Q" })).toHaveAttribute(
    "data-status",
    "unused",
  );

  await page.getByRole("button", { name: "Backspace" }).click();
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(
    page.getByRole("group", { name: "Current guess: QZXQ" }),
  ).toBeVisible();
});

test("a winning guess is authoritative and has no separate revealed answer", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const attempt = (await readAttemptPayload(await initialAttemptResponse))
    .attempt;
  await expectWordleToBeUsable(page);

  const winningResponse = waitForGuessResponse(page, attempt.attemptId);
  await enterGuess(page, puzzle.answer);
  const winningPayload = await readAttemptPayload(await winningResponse);

  expect(winningPayload.attempt.gameStatus).toBe("won");
  expect(winningPayload.attempt.submittedGuesses.at(-1)?.guess).toBe(
    puzzle.answer,
  );
  expect(winningPayload.attempt).not.toHaveProperty("revealedAnswer");
  await expect(page.getByRole("status")).toHaveText("You got it!");
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "On-screen keyboard" }),
  ).toBeVisible();
});

test("refresh resumes the same active Attempt without reanimating history", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const initialAttempt = (
    await readAttemptPayload(await initialAttemptResponse)
  ).attempt;
  await expectWordleToBeUsable(page);

  const guessResponse = waitForGuessResponse(page, initialAttempt.attemptId);
  await enterGuess(page, validMiss);
  const progressed = (await readAttemptPayload(await guessResponse)).attempt;
  await expect(page.getByRole("group", { name: /^Guess 1:/ })).toBeVisible();

  const resumeResponse = waitForAttemptResponse(page);
  await page.reload();
  const resumed = (await readAttemptPayload(await resumeResponse)).attempt;

  expect(resumed.attemptId).toBe(initialAttempt.attemptId);
  expect(resumed.version).toBe(progressed.version);
  expect(resumed.submittedGuesses).toEqual(progressed.submittedGuesses);
  await expect(
    page
      .getByRole("group", { name: /^Guess 1:/ })
      .locator(".wordle-tile-reveal"),
  ).toHaveCount(0);
});

test("loss reveals the answer while retaining the completed board and keyboard", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const attempt = (await readAttemptPayload(await initialAttemptResponse))
    .attempt;
  await expectWordleToBeUsable(page);

  let finalSnapshot: AttemptSnapshot | null = null;

  for (let index = 0; index < 6; index += 1) {
    const guessResponse = waitForGuessResponse(page, attempt.attemptId);
    await enterGuess(page, validMiss);
    finalSnapshot = (await readAttemptPayload(await guessResponse)).attempt;
  }

  expect(finalSnapshot).toMatchObject({
    gameStatus: "lost",
    revealedAnswer: puzzle.answer,
    version: 6,
  });
  await expect(page.getByRole("status")).toHaveText(
    `Game over. The answer was ${puzzle.answer}.`,
  );
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "On-screen keyboard" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeDisabled();
});

test("Next Word uses new mode and canonicalizes the selected puzzle URL", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const initialAttempt = (
    await readAttemptPayload(await initialAttemptResponse)
  ).attempt;
  await expectWordleToBeUsable(page);

  const winningResponse = waitForGuessResponse(page, initialAttempt.attemptId);
  await enterGuess(page, puzzle.answer);
  await readAttemptPayload(await winningResponse);

  const nextAttemptResponse = waitForAttemptResponse(page);
  const nextWordLink = page.getByRole("link", { name: "Next Word" });
  await expect(nextWordLink).toHaveAttribute(
    "href",
    `/games/wordle?exclude=${puzzle.id}`,
  );
  await nextWordLink.click();
  const nextResponse = await nextAttemptResponse;
  const nextAttempt = (await readAttemptPayload(nextResponse)).attempt;
  const nextRequest = nextResponse.request().postDataJSON() as {
    puzzleId: string;
    startMode: string;
  };

  expect(nextRequest.startMode).toBe("new");
  expect(nextRequest.puzzleId).not.toBe(puzzle.id);
  expect(nextAttempt.attemptId).not.toBe(initialAttempt.attemptId);
  expectPlayingSnapshot(nextAttempt, 0);
  await page.waitForURL(
    (url) => wordlePuzzlePathPattern.test(url.pathname) && !url.search,
  );
  expect(new URL(page.url()).pathname).not.toBe(wordlePuzzlePath);
  await expectWordleToBeUsable(page);
});

test("repeated same-puzzle new markers create fresh authoritative Attempts", async ({
  page,
}) => {
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  const initialAttempt = (
    await readAttemptPayload(await initialAttemptResponse)
  ).attempt;
  await expectWordleToBeUsable(page);

  const firstWinResponse = waitForGuessResponse(page, initialAttempt.attemptId);
  await enterGuess(page, puzzle.answer);
  await readAttemptPayload(await firstWinResponse);

  const firstNewResponse = waitForAttemptResponse(page);
  await page.goto(`${wordlePuzzlePath}?start=new&request=e2e-first`);
  const firstNew = (await readAttemptPayload(await firstNewResponse)).attempt;
  expect(firstNew.attemptId).not.toBe(initialAttempt.attemptId);
  expectPlayingSnapshot(firstNew, 0);
  await page.waitForURL(wordlePuzzlePath);

  const secondWinResponse = waitForGuessResponse(page, firstNew.attemptId);
  await enterGuess(page, puzzle.answer);
  await readAttemptPayload(await secondWinResponse);

  const secondNewResponse = waitForAttemptResponse(page);
  await page.goto(`${wordlePuzzlePath}?start=new&request=e2e-second`);
  const secondNew = (await readAttemptPayload(await secondNewResponse)).attempt;

  expect(secondNew.attemptId).not.toBe(firstNew.attemptId);
  expectPlayingSnapshot(secondNew, 0);
  await page.waitForURL(wordlePuzzlePath);
  await expectWordleToBeUsable(page);
});

test("the 320px keyboard has usable targets without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const initialAttemptResponse = waitForAttemptResponse(page);
  await page.goto(wordlePuzzlePath);
  await readAttemptPayload(await initialAttemptResponse);
  await expectWordleToBeUsable(page);

  const targetHeights = await page
    .getByRole("group", { name: "On-screen keyboard" })
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
  const horizontalMetrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(Math.min(...targetHeights)).toBeGreaterThanOrEqual(51);
  expect(horizontalMetrics.documentWidth).toBeLessThanOrEqual(
    horizontalMetrics.viewportWidth,
  );
});

async function enterGuess(page: Page, guess: string) {
  for (const letter of guess) {
    await page
      .getByRole("button", {
        name: new RegExp(`^${letter}(?:, (?:correct|present|absent))?$`),
      })
      .click();
  }

  await expect(
    page.getByRole("group", { name: `Current guess: ${guess}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter" }).click();
}

async function expectWordleToBeUsable(page: Page) {
  await expect(page.getByRole("heading", { name: "Wordle" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Wordle board" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter" })).toBeEnabled();
}

function waitForAttemptResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/games/wordle/attempts" &&
      response.request().method() === "POST"
    );
  });
}

function waitForGuessResponse(page: Page, attemptId: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === `/api/games/wordle/attempts/${attemptId}/guesses` &&
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

function expectPlayingSnapshot(attempt: AttemptSnapshot, version: number) {
  expect(attempt).toMatchObject({ version, gameStatus: "playing" });
  expect(attempt.submittedGuesses).toHaveLength(version);
  expect(attempt).not.toHaveProperty("revealedAnswer");
}

function expectSnapshotShape(attempt: AttemptSnapshot) {
  expect(Object.keys(attempt).sort()).toEqual(
    [
      "attemptId",
      "gameStatus",
      "submittedGuesses",
      "version",
      ...(attempt.gameStatus === "lost" ? ["revealedAnswer"] : []),
    ].sort(),
  );
  expect(attempt.version).toBe(attempt.submittedGuesses.length);

  for (const submitted of attempt.submittedGuesses) {
    expect(submitted.guess).toMatch(/^[A-Z]{5}$/);
    expect(submitted.evaluation).toHaveLength(5);
  }
}
