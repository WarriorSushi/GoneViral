const sensitiveKey =
  /(?:authorization|cookie|email|password|phone|secret|signature|token|rawbody|apikey|ipaddress|ip_hmac|providerpayment|providerevent|internalnote|reportexplanation)/i;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const phonePattern = /(?<!\d)\+?[1-9]\d{9,14}(?!\d)/g;
const redacted = "[REDACTED]";

function scrubString(value: string): string {
  const withoutCredentials = value
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(phonePattern, "[REDACTED_PHONE]");

  return withoutCredentials.replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
    try {
      const url = new URL(candidate);
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return candidate;
    }
  });
}

export function redactTelemetryValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactTelemetryValue(item, seen));
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKey.test(key)
        ? redacted
        : redactTelemetryValue(nestedValue, seen),
    ]),
  );
}

export function scrubTelemetryEvent<T>(event: T): T {
  return redactTelemetryValue(event) as T;
}
