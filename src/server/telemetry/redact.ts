const sensitiveKey =
  /(?:authorization|cookie|email|password|phone|secret|signature|token|rawBody|apiKey)/i;

const redacted = "[REDACTED]";

export function redactLogValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, seen));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKey.test(key) ? redacted : redactLogValue(nestedValue, seen),
    ]),
  );
}
