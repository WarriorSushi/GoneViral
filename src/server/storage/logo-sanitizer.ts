import "server-only";

import { createHash } from "node:crypto";

import sharp from "sharp";

import {
  LOGO_INPUT_TYPES,
  LOGO_MAX_DIMENSION,
  LOGO_MAX_INPUT_BYTES,
  LOGO_MAX_OUTPUT_BYTES,
  LOGO_MAX_PIXELS,
  LOGO_OUTPUT_SIZE,
} from "./logo-policy";

export type LogoRejectionCode =
  | "animated"
  | "decode_failed"
  | "dimensions"
  | "mime_mismatch"
  | "oversize"
  | "pixel_limit"
  | "polyglot"
  | "unsupported_type";

export type SanitizedLogo = Readonly<{
  bytes: Buffer;
  contentType: "image/webp";
  height: 128;
  sha256: string;
  width: 128;
}>;

export type LogoSanitizeResult =
  | Readonly<{ code: LogoRejectionCode; ok: false }>
  | Readonly<{ ok: true; value: SanitizedLogo }>;

function detectedType(
  bytes: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

function hasExactContainerLength(
  bytes: Buffer,
  type: "image/jpeg" | "image/png" | "image/webp",
): boolean {
  if (type === "image/jpeg")
    return bytes.length >= 4 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (type === "image/webp") return bytes.readUInt32LE(4) + 8 === bytes.length;

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const kind = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    offset += 12 + length;
    if (offset > bytes.length) return false;
    if (kind === "IEND") return length === 0 && offset === bytes.length;
  }
  return false;
}

export async function sanitizeLogo(
  bytes: Buffer,
  claimedContentType: string,
): Promise<LogoSanitizeResult> {
  if (bytes.length === 0 || bytes.length > LOGO_MAX_INPUT_BYTES)
    return { code: "oversize", ok: false };
  if (!LOGO_INPUT_TYPES.has(claimedContentType))
    return { code: "unsupported_type", ok: false };
  const type = detectedType(bytes);
  if (!type || type !== claimedContentType)
    return { code: "mime_mismatch", ok: false };
  if (!hasExactContainerLength(bytes, type))
    return { code: "polyglot", ok: false };

  try {
    const input = sharp(bytes, {
      animated: true,
      failOn: "warning",
      limitInputPixels: LOGO_MAX_PIXELS,
    });
    const metadata = await input.metadata();
    if (
      (metadata.pages ?? 1) !== 1 ||
      (metadata.pageHeight ?? metadata.height) !== metadata.height
    )
      return { code: "animated", ok: false };
    if (!metadata.width || !metadata.height)
      return { code: "dimensions", ok: false };
    if (
      metadata.width > LOGO_MAX_DIMENSION ||
      metadata.height > LOGO_MAX_DIMENSION
    )
      return { code: "dimensions", ok: false };
    if (metadata.width * metadata.height > LOGO_MAX_PIXELS)
      return { code: "pixel_limit", ok: false };

    const output = await sharp(bytes, { limitInputPixels: LOGO_MAX_PIXELS })
      .rotate()
      .resize(LOGO_OUTPUT_SIZE, LOGO_OUTPUT_SIZE, {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        fit: "contain",
        withoutEnlargement: false,
      })
      .webp({ effort: 5, quality: 82 })
      .toBuffer();
    if (output.length > LOGO_MAX_OUTPUT_BYTES)
      return { code: "oversize", ok: false };
    return {
      ok: true,
      value: {
        bytes: output,
        contentType: "image/webp",
        height: 128,
        sha256: createHash("sha256").update(output).digest("hex"),
        width: 128,
      },
    };
  } catch (error) {
    return {
      code:
        error instanceof Error && /pixel limit/i.test(error.message)
          ? "pixel_limit"
          : "decode_failed",
      ok: false,
    };
  }
}
