import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isStrandsAttemptId,
  parseStartStrandsAttemptRequest,
  parseSubmitStrandsPathRequest,
} from "@/server/strands/strandsRequestValidation";

describe("Strands request validation", () => {
  it("accepts a canonical puzzle ID", () => {
    expect(parseStartStrandsAttemptRequest({ puzzleId: "wedding-01" })).toEqual(
      { puzzleId: "wedding-01" },
    );
  });

  it("rejects malformed puzzle selectors", () => {
    expect(parseStartStrandsAttemptRequest({ puzzleId: "" })).toBeNull();
    expect(
      parseStartStrandsAttemptRequest({ puzzleId: "Invalid ID" }),
    ).toBeNull();
    expect(parseStartStrandsAttemptRequest(null)).toBeNull();
  });

  it("accepts bounded tile paths and nonnegative versions", () => {
    expect(
      parseSubmitStrandsPathRequest({
        path: [0, 1, 7, 6],
        version: 2,
      }),
    ).toEqual({
      path: [0, 1, 7, 6],
      version: 2,
    });
  });

  it("rejects malformed path submissions", () => {
    expect(
      parseSubmitStrandsPathRequest({ path: [0, 48], version: 0 }),
    ).toBeNull();
    expect(
      parseSubmitStrandsPathRequest({ path: [0, 1.5], version: 0 }),
    ).toBeNull();
    expect(
      parseSubmitStrandsPathRequest({ path: [0, 1], version: -1 }),
    ).toBeNull();
    expect(
      parseSubmitStrandsPathRequest({
        path: Array.from({ length: 49 }, (_, index) => index % 48),
        version: 0,
      }),
    ).toBeNull();
  });

  it("recognizes only UUID Attempt selectors", () => {
    expect(
      isStrandsAttemptId("60000000-0000-4000-8000-000000000301"),
    ).toBe(true);
    expect(isStrandsAttemptId("not-an-attempt")).toBe(false);
  });
});
