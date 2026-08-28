import { isIP } from "node:net";
import { domainToASCII } from "node:url";

import { DESTINATION_URL_MAX_BYTES } from "./policy";

const blockedHostSuffixes = [
  ".internal",
  ".local",
  ".localhost",
  ".home.arpa",
  ".example",
  ".invalid",
  ".test",
] as const;

const blockedRedirectHosts = new Set([
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "is.gd",
  "rebrand.ly",
  "t.co",
  "tinyurl.com",
]);

export type SafeDestination = Readonly<{
  canonicalKey: string;
  host: string;
  url: string;
}>;

export type DestinationFailure =
  | "DESTINATION_INVALID"
  | "DESTINATION_NOT_HTTPS"
  | "DESTINATION_NOT_PUBLIC"
  | "DESTINATION_REDIRECTOR"
  | "DESTINATION_TOO_LONG";

export type DestinationResult =
  | Readonly<{ ok: true; value: SafeDestination }>
  | Readonly<{ code: DestinationFailure; ok: false }>;

function invalid(code: DestinationFailure): DestinationResult {
  return { code, ok: false };
}

function isPublicRegistrableHost(host: string): boolean {
  if (
    host === "localhost" ||
    isIP(host) !== 0 ||
    blockedHostSuffixes.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
    )
  ) {
    return false;
  }

  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => label.length === 0)) {
    return false;
  }

  return labels.every(
    (label) =>
      label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

export function canonicalizeDestination(input: string): DestinationResult {
  const trimmed = input.trim();
  if (Buffer.byteLength(trimmed, "utf8") > DESTINATION_URL_MAX_BYTES) {
    return invalid("DESTINATION_TOO_LONG");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return invalid("DESTINATION_INVALID");
  }

  if (parsed.protocol !== "https:") {
    return invalid("DESTINATION_NOT_HTTPS");
  }
  if (parsed.username || parsed.password) {
    return invalid("DESTINATION_INVALID");
  }

  const asciiHost = domainToASCII(
    parsed.hostname.toLowerCase().replace(/\.$/, ""),
  );
  if (!asciiHost || !isPublicRegistrableHost(asciiHost)) {
    return invalid("DESTINATION_NOT_PUBLIC");
  }
  if (blockedRedirectHosts.has(asciiHost)) {
    return invalid("DESTINATION_REDIRECTOR");
  }

  parsed.hostname = asciiHost;
  parsed.hash = "";
  if (parsed.port === "443") parsed.port = "";

  const canonical = parsed.toString();
  if (Buffer.byteLength(canonical, "utf8") > DESTINATION_URL_MAX_BYTES) {
    return invalid("DESTINATION_TOO_LONG");
  }

  return {
    ok: true,
    value: { canonicalKey: canonical, host: asciiHost, url: canonical },
  };
}
