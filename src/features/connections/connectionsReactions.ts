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

export function selectConnectionsReactionPhoto(
  kind: ConnectionsReactionKind,
  currentGameUsed: ReadonlySet<string> = new Set(),
  previousGameUsed: ReadonlySet<string> = new Set(),
  random: () => number = Math.random,
): string | null {
  const photos = reactionPhotos[kind];
  const unusedThisGame = photos.filter((photo) => !currentGameUsed.has(photo));
  const preferredPhotos = unusedThisGame.filter(
    (photo) => !previousGameUsed.has(photo),
  );
  const eligiblePhotos =
    preferredPhotos.length > 0 ? preferredPhotos : unusedThisGame;

  if (eligiblePhotos.length === 0) {
    return null;
  }

  const randomValue = random();

  if (randomValue < 0 || randomValue >= 1 || !Number.isFinite(randomValue)) {
    throw new Error(
      "Connections reaction random value must be at least 0 and less than 1.",
    );
  }

  return eligiblePhotos[Math.floor(randomValue * eligiblePhotos.length)]!;
}
