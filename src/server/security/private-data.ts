import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { readServerEnv } from "@/config/env/server";

const localKey = Buffer.from(
  "c6d313d7e972e305539f3e6e0c6c10936d631a5e3f468fc657acfdfe298301d8",
  "hex",
);

function decodeKey(value: string, name: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(`${name} must decode to 32 bytes.`);
  }
  return key;
}

function encryptionKeys(): { current: Buffer; previous?: Buffer } {
  const environment = readServerEnv();
  if (!environment.PRIVATE_DATA_ENCRYPTION_KEY) {
    if (environment.NODE_ENV === "production") {
      throw new Error("PRIVATE_DATA_ENCRYPTION_KEY is required in production.");
    }
    return { current: localKey };
  }

  return {
    current: decodeKey(
      environment.PRIVATE_DATA_ENCRYPTION_KEY,
      "PRIVATE_DATA_ENCRYPTION_KEY",
    ),
    ...(environment.PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS
      ? {
          previous: decodeKey(
            environment.PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS,
            "PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS",
          ),
        }
      : {}),
  };
}

export function encryptPrivateText(plaintext: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKeys().current, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptPrivateText(encoded: string): string {
  const [version, nonceValue, tagValue, ciphertextValue, ...extra] =
    encoded.split(".");
  if (
    version !== "v1" ||
    !nonceValue ||
    !tagValue ||
    !ciphertextValue ||
    extra.length > 0
  ) {
    throw new Error("private_text_format_invalid");
  }
  const nonce = Buffer.from(nonceValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("private_text_format_invalid");
  }
  const keys = encryptionKeys();
  for (const key of [keys.current, keys.previous].filter(
    (candidate): candidate is Buffer => Boolean(candidate),
  )) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // During a controlled rotation, existing envelopes may still use the
      // explicitly configured previous key.
    }
  }
  throw new Error("private_text_authentication_failed");
}
