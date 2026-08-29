import { describe, expect, it } from "vitest";

import { buildShareText } from "@/components/public/share-controls";

describe("truthful listing share copy", () => {
  it("states only the supplied actual current rank and sponsorship context", () => {
    const copy = buildShareText("Monsoon Studio", "3");
    expect(copy).toBe(
      "Monsoon Studio is currently #3 on the paid GoneViral.in leaderboard.",
    );
    expect(copy).not.toMatch(/estimated|reserved|reach|views|followers/i);
  });
});
