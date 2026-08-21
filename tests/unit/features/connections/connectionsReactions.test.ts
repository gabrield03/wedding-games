import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  selectConnectionsReactionPhoto,
  type ConnectionsReactionKind,
} from "@/features/connections/connectionsReactions";

const expectedPhotos: Record<ConnectionsReactionKind, string[]> = {
  correct: [
    "/images/connections/reactions/correct/correct-1.JPEG",
    "/images/connections/reactions/correct/correct-2.JPEG",
    "/images/connections/reactions/correct/correct-3.jpg",
    "/images/connections/reactions/correct/correct-4.JPEG",
    "/images/connections/reactions/correct/correct-5.JPEG",
    "/images/connections/reactions/correct/correct-6.PNG",
    "/images/connections/reactions/correct/correct-7.JPEG",
    "/images/connections/reactions/correct/correct-8.JPEG",
  ],
  incorrect: [
    "/images/connections/reactions/incorrect/incorrect-1.PNG",
    "/images/connections/reactions/incorrect/incorrect-2.JPEG",
    "/images/connections/reactions/incorrect/incorrect-3.JPEG",
    "/images/connections/reactions/incorrect/incorrect-4.JPEG",
    "/images/connections/reactions/incorrect/incorrect-5.JPEG",
    "/images/connections/reactions/incorrect/incorrect-6.JPEG",
    "/images/connections/reactions/incorrect/incorrect-7.JPEG",
    "/images/connections/reactions/incorrect/incorrect-8.JPEG",
    "/images/connections/reactions/incorrect/incorrect-9.JPEG",
    "/images/connections/reactions/incorrect/incorrect-10.JPEG",
    "/images/connections/reactions/incorrect/incorrect-11.JPEG",
  ],
  loss: [
    "/images/connections/reactions/loss/loss-1.JPEG",
    "/images/connections/reactions/loss/loss-2.png",
    "/images/connections/reactions/loss/loss-3.JPEG",
    "/images/connections/reactions/loss/loss-4.JPEG",
  ],
  win: [
    "/images/connections/reactions/win/win-1.JPEG",
    "/images/connections/reactions/win/win-2.JPEG",
    "/images/connections/reactions/win/win-3.JPEG",
    "/images/connections/reactions/win/win-4.JPEG",
    "/images/connections/reactions/win/win-5.JPEG",
  ],
};

describe("selectConnectionsReactionPhoto", () => {
  for (const [kind, photos] of Object.entries(expectedPhotos) as [
    ConnectionsReactionKind,
    string[],
  ][]) {
    it(`selects uniformly across the ${kind} pool`, () => {
      const selectedPhotos = photos.map((_, index) =>
        selectConnectionsReactionPhoto(
          kind,
          new Set(),
          new Set(),
          () => (index + 0.5) / photos.length,
        ),
      );

      expect(selectedPhotos).toEqual(photos);
    });

    it(`keeps the remaining ${kind} photos uniform after current-game exclusions`, () => {
      const usedPhotos = new Set([photos[0]!, photos[1]!]);
      const eligiblePhotos = photos.slice(2);
      const selectedPhotos = eligiblePhotos.map((_, index) =>
        selectConnectionsReactionPhoto(
          kind,
          usedPhotos,
          new Set(),
          () => (index + 0.5) / eligiblePhotos.length,
        ),
      );

      expect(selectedPhotos).toEqual(eligiblePhotos);
      expect(selectedPhotos).not.toContain(photos[0]);
      expect(selectedPhotos).not.toContain(photos[1]);
    });

    it(`references existing files in the ${kind} pool`, () => {
      for (const photo of photos) {
        expect(existsSync(join(process.cwd(), "public", photo.slice(1)))).toBe(
          true,
        );
      }
    });
  }

  it("prefers photos unused in both the current and previous game", () => {
    const photos = expectedPhotos.correct;

    expect(
      selectConnectionsReactionPhoto(
        "correct",
        new Set([photos[0]!]),
        new Set([photos[1]!, photos[2]!]),
        () => 0,
      ),
    ).toBe(photos[3]);
  });

  it("relaxes only previous-game avoidance when necessary", () => {
    const photos = expectedPhotos.loss;

    expect(
      selectConnectionsReactionPhoto(
        "loss",
        new Set([photos[0]!, photos[1]!, photos[2]!]),
        new Set([photos[3]!]),
        () => 0,
      ),
    ).toBe(photos[3]);
  });

  it("returns null instead of repeating after current-game exhaustion", () => {
    expect(
      selectConnectionsReactionPhoto(
        "win",
        new Set(expectedPhotos.win),
        new Set(),
        () => 0,
      ),
    ).toBeNull();
  });

  it("rejects random values outside the Math.random range", () => {
    expect(() =>
      selectConnectionsReactionPhoto("correct", new Set(), new Set(), () => 1),
    ).toThrow(
      "Connections reaction random value must be at least 0 and less than 1.",
    );
  });
});
