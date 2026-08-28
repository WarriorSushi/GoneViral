import { describe, expect, it } from "vitest";
import { publicEnvSchema } from "@/config/env/public";

describe("public environment schema", () => {
  it("uses the local site URL without inventing integration credentials", () => {
    expect(publicEnvSchema.parse({})).toEqual({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
  });

  it("requires the Supabase publishable URL and key together", () => {
    expect(() =>
      publicEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(/configured together/);
  });

  it("strips an accidental server secret from the public shape", () => {
    const result = publicEnvSchema.parse({
      NEXT_PUBLIC_SITE_URL: "https://goneviral.in",
      DODO_PAYMENTS_API_KEY: "must-not-survive",
    });

    expect(result).not.toHaveProperty("DODO_PAYMENTS_API_KEY");
  });
});
