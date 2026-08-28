import { randomBytes } from "node:crypto";

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  verifyLogoUploadIntent,
  signLogoUploadIntent,
} from "@/server/storage/logo-intent";
import { LOGO_MAX_INPUT_BYTES } from "@/server/storage/logo-policy";
import { sanitizeLogo } from "@/server/storage/logo-sanitizer";

beforeEach(() => {
  process.env.SUBMISSION_HMAC_SECRET = "phase8-logo-unit-test-signing-secret";
});

describe("safe logo sanitization", () => {
  it.each([
    ["image/jpeg", "jpeg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ] as const)(
    "accepts %s and emits one fixed metadata-free WebP",
    async (contentType, format) => {
      let image = sharp({
        create: { background: "#ff4f5e", channels: 4, height: 72, width: 96 },
      });
      if (format === "jpeg")
        image = image.withMetadata({
          exif: { IFD0: { Copyright: "private marker" } },
        });
      const input = await image[format]().toBuffer();
      const result = await sanitizeLogo(input, contentType);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const metadata = await sharp(result.value.bytes).metadata();
      expect(metadata).toMatchObject({
        format: "webp",
        height: 128,
        width: 128,
      });
      expect(metadata.pages ?? 1).toBe(1);
      expect(metadata.exif).toBeUndefined();
      expect(result.value.bytes.includes(Buffer.from("private marker"))).toBe(
        false,
      );
    },
  );

  it("rejects SVG, GIF, unknown and MIME substitution", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
    );
    const gif = Buffer.from("GIF89a", "ascii");
    await expect(sanitizeLogo(svg, "image/svg+xml")).resolves.toMatchObject({
      code: "unsupported_type",
      ok: false,
    });
    await expect(sanitizeLogo(gif, "image/gif")).resolves.toMatchObject({
      code: "unsupported_type",
      ok: false,
    });
    await expect(
      sanitizeLogo(randomBytes(64), "image/png"),
    ).resolves.toMatchObject({
      code: "mime_mismatch",
      ok: false,
    });
    const png = await sharp({
      create: { background: "black", channels: 3, height: 8, width: 8 },
    })
      .png()
      .toBuffer();
    await expect(sanitizeLogo(png, "image/jpeg")).resolves.toMatchObject({
      code: "mime_mismatch",
      ok: false,
    });
  });

  it("rejects appended polyglot payloads and oversized inputs", async () => {
    const jpeg = await sharp({
      create: { background: "white", channels: 3, height: 8, width: 8 },
    })
      .jpeg()
      .toBuffer();
    await expect(
      sanitizeLogo(
        Buffer.concat([jpeg, Buffer.from("<script>alert(1)</script>")]),
        "image/jpeg",
      ),
    ).resolves.toMatchObject({ code: "polyglot", ok: false });
    await expect(
      sanitizeLogo(Buffer.alloc(LOGO_MAX_INPUT_BYTES + 1), "image/png"),
    ).resolves.toMatchObject({ code: "oversize", ok: false });
  });

  it("rejects decompression and dimension bombs before re-encoding", async () => {
    const bomb = await sharp({
      create: { background: "white", channels: 3, height: 4_096, width: 4_096 },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await expect(sanitizeLogo(bomb, "image/png")).resolves.toMatchObject({
      code: expect.stringMatching(/^(dimensions|pixel_limit)$/),
      ok: false,
    });
  });
});

describe("short owner-bound logo intent", () => {
  it("accepts the exact signed payload and rejects tamper or expiry", () => {
    const intent = {
      assetId: "123e4567-e89b-42d3-a456-426614174000",
      expiresAt: Date.now() + 60_000,
      userId: "123e4567-e89b-42d3-a456-426614174001",
    };
    const token = signLogoUploadIntent(intent);
    expect(verifyLogoUploadIntent(token)).toEqual(intent);
    expect(verifyLogoUploadIntent(`${token}x`)).toBeNull();
    expect(verifyLogoUploadIntent(token, intent.expiresAt)).toBeNull();
  });
});
