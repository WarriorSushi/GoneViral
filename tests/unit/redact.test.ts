import { describe, expect, it } from "vitest";
import { redactLogValue } from "@/server/telemetry/redact";

describe("structured log redaction", () => {
  it("redacts secret and PII-shaped keys recursively", () => {
    expect(
      redactLogValue({
        requestId: "req_public_safe",
        email: "person@example.test",
        nested: {
          authorization: "Bearer secret",
          providerPaymentId: "pay_safe_for_restricted_logs_only",
        },
      }),
    ).toEqual({
      requestId: "req_public_safe",
      email: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        providerPaymentId: "[REDACTED]",
      },
    });
  });

  it("scrubs credentials and query strings even when they appear in values", () => {
    expect(
      redactLogValue({
        message:
          "Contact owner@example.test at +919876543210 using Bearer abc.def and https://example.test/path?private=yes#secret",
      }),
    ).toEqual({
      message:
        "Contact [REDACTED_EMAIL] at [REDACTED_PHONE] using Bearer [REDACTED] and https://example.test/path",
    });
  });

  it("does not recurse forever through a circular object", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(redactLogValue(circular)).toEqual({ self: "[CIRCULAR]" });
  });
});
