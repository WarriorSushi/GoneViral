import { describe, expect, it } from "vitest";

import {
  normalizeListingName,
  validateListingEdit,
} from "@/domain/listing-edit";

function form(overrides: Partial<Record<string, string>> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    category: "tech-apps",
    destination: "https://example.org/new-path?ref=board",
    name: "Example Studio",
    tagline: "A concise new tagline",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}

describe("owner listing edit validation", () => {
  it("canonicalizes safe fields and stable display-name corrections", () => {
    const result = validateListingEdit(form());
    expect(result.ok && result.value.destination).toEqual({
      canonicalKey: "https://example.org/new-path?ref=board",
      host: "example.org",
      url: "https://example.org/new-path?ref=board",
    });
    expect(normalizeListingName("Ｅxample Studio")).toBe("example studio");
  });

  it("rejects unsafe destinations and overlong identity fields", () => {
    expect(
      validateListingEdit(
        form({ destination: "http://127.0.0.1/admin", name: "x".repeat(81) }),
      ),
    ).toMatchObject({
      errors: { destination: expect.any(String), name: expect.any(String) },
      ok: false,
    });
  });
});
