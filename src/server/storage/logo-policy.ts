export const LOGO_STAGING_BUCKET = "goneviral-logo-staging";
export const LOGO_PUBLIC_BUCKET = "goneviral-logo-public";
export const LOGO_MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const LOGO_MAX_DIMENSION = 4_096;
export const LOGO_MAX_PIXELS = 16_000_000;
export const LOGO_OUTPUT_SIZE = 128;
export const LOGO_MAX_OUTPUT_BYTES = 256 * 1024;
export const LOGO_UPLOAD_INTENT_SECONDS = 10 * 60;

export const LOGO_INPUT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
