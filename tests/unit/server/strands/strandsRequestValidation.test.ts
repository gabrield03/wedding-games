import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseStartStrandsAttemptRequest } from "@/server/strands/strandsRequestValidation";

describe("Strands request validation", () => {
  it("accepts a canonical puzzle ID", () => {
    expect(
      parseStartStrandsAttemptRequest({ puzzleId: "wedding-01" }),
    ).toEqual({ puzzleId: "wedding-01" });
  });

  it("rejects malformed puzzle selectors", () => {
    expect(parseStartStrandsAttemptRequest({ puzzleId: "" })).toBeNull();
    expect(
      parseStartStrandsAttemptRequest({ puzzleId: "Invalid ID" }),
    ).toBeNull();
    expect(parseStartStrandsAttemptRequest(null)).toBeNull();
  });
});
