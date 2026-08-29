import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decryptPrivateText,
  encryptPrivateText,
} from "@/server/security/private-data";

describe("private recipient encryption", () => {
  it("round-trips without putting plaintext in the stored envelope", () => {
    vi.stubEnv("NODE_ENV", "test");
    const plaintext = "owner@example.com";
    const encrypted = encryptPrivateText(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptPrivateText(encrypted)).toBe(plaintext);
  });

  it("rejects tampered authenticated ciphertext", () => {
    vi.stubEnv("NODE_ENV", "test");
    const encrypted = encryptPrivateText("owner@example.com");
    expect(() => decryptPrivateText(`${encrypted.slice(0, -1)}x`)).toThrow();
  });
});
