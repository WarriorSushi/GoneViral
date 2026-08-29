import { Webhook } from "standardwebhooks";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyResendWebhook } from "@/server/email/resend-webhook";

const secret = `whsec_${Buffer.from("phase12-resend-webhook-secret").toString("base64")}`;

function signed(body: string, date = new Date()) {
  vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
  const id = "resend-event-123";
  const webhook = new Webhook(secret);
  return new Headers({
    "svix-id": id,
    "svix-signature": webhook.sign(id, date, body),
    "svix-timestamp": String(Math.floor(date.getTime() / 1_000)),
  });
}

describe("Resend delivery webhook verification", () => {
  it("verifies exact bytes and keeps only delivery-safe fields", () => {
    const createdAt = new Date().toISOString();
    const body = JSON.stringify({
      created_at: createdAt,
      data: {
        email_id: "resend-message-123",
        to: ["owner@example.com"],
        subject: "private subject",
      },
      type: "email.delivered",
    });
    expect(verifyResendWebhook(body, signed(body))).toEqual({
      eventId: "resend-event-123",
      occurredAt: new Date(createdAt),
      providerMessageId: "resend-message-123",
      type: "email.delivered",
    });
  });

  it("rejects modified bodies and missing signatures", () => {
    const body = JSON.stringify({
      created_at: new Date().toISOString(),
      data: { email_id: "resend-message-123" },
      type: "email.bounced",
    });
    const headers = signed(body);
    expect(() => verifyResendWebhook(`${body} `, headers)).toThrow();
    expect(() => verifyResendWebhook(body, new Headers())).toThrow();
  });
});
