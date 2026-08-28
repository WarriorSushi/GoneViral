import "server-only";

import { createCipheriv, randomBytes } from "node:crypto";

import { readServerEnv } from "@/config/env/server";

const localKey = Buffer.from(
  "c6d313d7e972e305539f3e6e0c6c10936d631a5e3f468fc657acfdfe298301d8",
  "hex",
);

function encryptionKey(): Buffer {
  const environment = readServerEnv();
  if (!environment.PRIVATE_DATA_ENCRYPTION_KEY) {
    if (environment.NODE_ENV === "production") {
      throw new Error("PRIVATE_DATA_ENCRYPTION_KEY is required in production.");
    }
    return localKey;
  }

  const key = Buffer.from(environment.PRIVATE_DATA_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("PRIVATE_DATA_ENCRYPTION_KEY must decode to 32 bytes.");
  }
  return key;
}

export function encryptPrivateText(plaintext: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
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
