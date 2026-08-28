import { describe, expect, it } from "vitest";

import { screenSubmission } from "@/domain/screening";

describe("deterministic listing screening", () => {
  it("clears ordinary submissions", () => {
    expect(
      screenSubmission({
        destinationHost: "example.com",
        name: "Helpful Studio",
        tagline: "Design for growing teams",
      }).status,
    ).toBe("clear");
  });

  it("sends ambiguous claims to review", () => {
    expect(
      screenSubmission({
        destinationHost: "example.com",
        name: "Signal Club",
        tagline: "Guaranteed profit from our forex signals",
      }),
    ).toMatchObject({
      reasonCodes: ["CLAIMS_REQUIRE_REVIEW"],
      status: "pending_review",
    });
  });

  it("rejects prohibited offers without creating a checkout", () => {
    expect(
      screenSubmission({
        destinationHost: "example.com",
        name: "Market",
        tagline: "Buy stolen goods here",
      }).status,
    ).toBe("rejected");
  });
});
