import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ConnectionsReaction } from "@/features/connections/ConnectionsReaction";

afterEach(cleanup);

describe("ConnectionsReaction", () => {
  it("top-aligns the narrow correct-3 portrait", () => {
    const { container } = render(
      <ConnectionsReaction
        reaction={{
          occurrence: 1,
          kind: "correct",
          src: "/images/connections/reactions/correct/correct-3.jpg",
        }}
      />,
    );

    expect(container.querySelector("img")?.className).toContain("object-top");
  });

  it("top-aligns the close correct-6 portrait", () => {
    const { container } = render(
      <ConnectionsReaction
        reaction={{
          occurrence: 1,
          kind: "correct",
          src: "/images/connections/reactions/correct/correct-6.PNG",
        }}
      />,
    );

    expect(container.querySelector("img")?.className).toContain("object-top");
  });

  it("keeps the default centered crop for other intermediate reactions", () => {
    const { container } = render(
      <ConnectionsReaction
        reaction={{
          occurrence: 1,
          kind: "incorrect",
          src: "/images/connections/reactions/incorrect/incorrect-1.PNG",
        }}
      />,
    );

    expect(container.querySelector("img")?.className).toContain(
      "object-center",
    );
  });

  it("right-aligns and insets the incorrect-2 reaction", () => {
    const { container } = render(
      <ConnectionsReaction
        reaction={{
          occurrence: 1,
          kind: "incorrect",
          src: "/images/connections/reactions/incorrect/incorrect-2.JPEG",
        }}
      />,
    );

    expect(container.querySelector("img")?.className).toContain("object-right");
    expect(
      container.querySelector('[data-connections-reaction="incorrect"]')
        ?.className,
    ).toContain("right-6");
  });
});
