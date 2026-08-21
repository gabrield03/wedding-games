export type ConnectionsReactionKind = "correct" | "incorrect" | "loss" | "win";

export type ConnectionsReaction = {
  occurrence: number;
  kind: ConnectionsReactionKind;
  src: string;
};

const reactionPhotos: Record<ConnectionsReactionKind, readonly string[]> = {
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

export function selectConnectionsReactionPhoto(
  kind: ConnectionsReactionKind,
  previousPhoto: string | null = null,
  random: () => number = Math.random,
): string {
  const photos = reactionPhotos[kind];
  const eligiblePhotos =
    photos.length > 1
      ? photos.filter((photo) => photo !== previousPhoto)
      : photos;
  const randomValue = random();

  if (randomValue < 0 || randomValue >= 1 || !Number.isFinite(randomValue)) {
    throw new Error(
      "Connections reaction random value must be at least 0 and less than 1.",
    );
  }

  return eligiblePhotos[Math.floor(randomValue * eligiblePhotos.length)]!;
}
