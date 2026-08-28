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
        providerPaymentId: "pay_safe_for_restricted_logs_only",
      },
    });
  });

  it("does not recurse forever through a circular object", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(redactLogValue(circular)).toEqual({ self: "[CIRCULAR]" });
  });
});
