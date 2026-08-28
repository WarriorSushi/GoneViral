import { readFileSync } from "node:fs";
import path from "node:path";

import { Webhook } from "standardwebhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getMockDodoWebhookSecretForTests,
  verifyAndNormalizeDodoWebhook,
} from "@/server/payments/dodo-webhook";

const fixture = readFileSync(
  path.resolve("tests/fixtures/dodo/local-payment-succeeded.json"),
  "utf8",
).trimEnd();

function signedHeaders(body: string, now = new Date()) {
  const eventId = "evt_local_contract_vector";
  const webhook = new Webhook(getMockDodoWebhookSecretForTests());
  return new Headers({
    "webhook-id": eventId,
    "webhook-signature": webhook.sign(eventId, now, body),
    "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
  });
}

beforeEach(() => {
  process.env.DODO_PAYMENTS_ENVIRONMENT = "mock";
  vi.stubEnv("NODE_ENV", "test");
});

describe("Dodo Standard Webhooks contract", () => {
  it("verifies exact raw bytes and normalizes a successful payment", () => {
    const event = verifyAndNormalizeDodoWebhook(
      fixture,
      signedHeaders(fixture),
    );
    expect(event).toMatchObject({
      businessId: "mock_business",
      eventType: "payment.succeeded",
      normalizedType: "payment_status",
      payment: {
        amountPaise: 49_900n,
        attemptPublicId: "att_abcdefghijklmnopqrstuvwx",
        currency: "INR",
        orderId: "mock_session_fixture",
        paymentId: "mock_payment_fixture",
        status: "succeeded",
      },
    });
  });

  it("rejects a one-byte body change and JSON reserialization", () => {
    const headers = signedHeaders(fixture);
    expect(() =>
      verifyAndNormalizeDodoWebhook(fixture.replace("49900", "49901"), headers),
    ).toThrow();
    const reserialized = JSON.stringify(JSON.parse(fixture));
    expect(() =>
      verifyAndNormalizeDodoWebhook(`${reserialized}\n`, headers),
    ).toThrow();
  });

  it("rejects missing, wrong, and stale signature headers", () => {
    expect(() =>
      verifyAndNormalizeDodoWebhook(fixture, new Headers()),
    ).toThrow();
    const wrong = signedHeaders(fixture);
    wrong.set("webhook-signature", "v1,invalid");
    expect(() => verifyAndNormalizeDodoWebhook(fixture, wrong)).toThrow();
    const stale = new Date(Date.now() - 6 * 60_000);
    expect(() =>
      verifyAndNormalizeDodoWebhook(fixture, signedHeaders(fixture, stale)),
    ).toThrow(/timestamp too old/i);
  });

  it("keeps an authentic unknown event for durable quarantine", () => {
    const body = JSON.stringify({
      business_id: "mock_business",
      data: { future: true },
      timestamp: new Date().toISOString(),
      type: "payment.future_state",
    });
    expect(
      verifyAndNormalizeDodoWebhook(body, signedHeaders(body)),
    ).toMatchObject({ normalizedType: "unknown", payment: null });
  });
});
