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
    const parts = encrypted.split(".");
    const ciphertext = Buffer.from(parts[3]!, "base64url");
    ciphertext[0] = ciphertext[0]! ^ 1;
    parts[3] = ciphertext.toString("base64url");
    expect(() => decryptPrivateText(parts.join("."))).toThrow(
      "private_text_authentication_failed",
    );
  });

  it("decrypts old envelopes through the explicit previous-key rotation window", () => {
    vi.stubEnv("NODE_ENV", "test");
    const oldKey = Buffer.alloc(32, 1).toString("base64");
    const newKey = Buffer.alloc(32, 2).toString("base64");
    vi.stubEnv("PRIVATE_DATA_ENCRYPTION_KEY", oldKey);
    const encrypted = encryptPrivateText("owner@example.com");
    vi.stubEnv("PRIVATE_DATA_ENCRYPTION_KEY", newKey);
    vi.stubEnv("PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS", oldKey);
    expect(decryptPrivateText(encrypted)).toBe("owner@example.com");
    expect(encryptPrivateText("new@example.com")).not.toBe(encrypted);
  });
});
