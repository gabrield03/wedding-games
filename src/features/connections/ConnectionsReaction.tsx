import Image from "next/image";

import type { ConnectionsReaction as ConnectionsReactionModel } from "./connectionsReactions";

const TOP_ALIGNED_REACTION_PHOTO =
  "/images/connections/reactions/correct/correct-3.jpg";
const RIGHT_ALIGNED_REACTION_PHOTO =
  "/images/connections/reactions/incorrect/incorrect-2.JPEG";

type ConnectionsReactionProps = {
  reaction: ConnectionsReactionModel;
};

export function ConnectionsReaction({ reaction }: ConnectionsReactionProps) {
  if (reaction.kind === "win" || reaction.kind === "loss") {
    const isWin = reaction.kind === "win";

    return (
      <div
        aria-hidden="true"
        data-connections-reaction={reaction.kind}
        className={`connections-reaction-terminal relative mx-auto mt-4 w-full overflow-hidden rounded-xl ${
          isWin ? "h-64 max-w-md sm:h-72" : "h-48 max-w-xs sm:h-56"
        }`}
      >
        <Image
          src={reaction.src}
          alt=""
          fill
          sizes={
            isWin
              ? "(max-width: 640px) calc(100vw - 2rem), 448px"
              : "(max-width: 640px) calc(100vw - 2rem), 320px"
          }
          className="object-contain"
        />
      </div>
    );
  }

  const isRightAlignedReaction = reaction.src === RIGHT_ALIGNED_REACTION_PHOTO;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      <div
        data-connections-reaction={reaction.kind}
        className={`absolute top-28 h-32 w-24 overflow-hidden rounded-xl shadow-lg sm:top-24 sm:h-40 sm:w-32 connections-reaction-${reaction.kind} ${
          isRightAlignedReaction ? "right-6" : "right-0"
        }`}
      >
        <Image
          src={reaction.src}
          alt=""
          fill
          sizes="(max-width: 640px) 96px, 128px"
          className={`object-cover ${
            reaction.src === TOP_ALIGNED_REACTION_PHOTO
              ? "object-top"
              : isRightAlignedReaction
                ? "object-right"
                : "object-center"
          }`}
        />
      </div>
    </div>
  );
}
