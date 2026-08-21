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
  ],
  incorrect: [
    "/images/connections/reactions/incorrect/incorrect-1.PNG",
    "/images/connections/reactions/incorrect/incorrect-2.JPEG",
    "/images/connections/reactions/incorrect/incorrect-3.JPEG",
    "/images/connections/reactions/incorrect/incorrect-4.JPEG",
    "/images/connections/reactions/incorrect/incorrect-5.JPEG",
    "/images/connections/reactions/incorrect/incorrect-6.JPEG",
    "/images/connections/reactions/incorrect/incorrect-7.JPEG",
  ],
  loss: [
    "/images/connections/reactions/loss/loss-1.JPEG",
    "/images/connections/reactions/loss/loss-2.png",
  ],
  win: [
    "/images/connections/reactions/win/win-1.JPEG",
    "/images/connections/reactions/win/win-2.JPEG",
    "/images/connections/reactions/win/win-3.JPEG",
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
          null,
          () => (index + 0.5) / photos.length,
        ),
      );

      expect(selectedPhotos).toEqual(photos);
    });

    it(`keeps the remaining ${kind} photos uniform after excluding the previous selection`, () => {
      const previousPhoto = photos[0]!;
      const eligiblePhotos = photos.slice(1);
      const selectedPhotos = eligiblePhotos.map((_, index) =>
        selectConnectionsReactionPhoto(
          kind,
          previousPhoto,
          () => (index + 0.5) / eligiblePhotos.length,
        ),
      );

      expect(selectedPhotos).toEqual(eligiblePhotos);
      expect(selectedPhotos).not.toContain(previousPhoto);
    });

    it(`references existing files in the ${kind} pool`, () => {
      for (const photo of photos) {
        expect(existsSync(join(process.cwd(), "public", photo.slice(1)))).toBe(
          true,
        );
      }
    });
  }

  it("rejects random values outside the Math.random range", () => {
    expect(() =>
      selectConnectionsReactionPhoto("correct", null, () => 1),
    ).toThrow(
      "Connections reaction random value must be at least 0 and less than 1.",
    );
  });
});
