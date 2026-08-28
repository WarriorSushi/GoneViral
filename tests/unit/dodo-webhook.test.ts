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

  it("normalizes successful and failed refunds into desired ledger state", () => {
    const createdAt = new Date().toISOString();
    for (const status of ["succeeded", "failed"] as const) {
      const body = JSON.stringify({
        business_id: "mock_business",
        data: {
          amount: 20_000,
          created_at: createdAt,
          currency: "INR",
          payment_id: "pay_refund_contract",
          refund_id: `ref_${status}`,
          status,
        },
        timestamp: createdAt,
        type: `refund.${status}`,
      });
      expect(
        verifyAndNormalizeDodoWebhook(body, signedHeaders(body)),
      ).toMatchObject({
        adjustment: {
          adjustmentId: `ref_${status}`,
          amountPaise: 20_000n,
          desiredEffectiveDelta: status === "succeeded" ? -20_000n : 0n,
          kind: "refund",
          paymentId: "pay_refund_contract",
          status,
        },
        normalizedType: "adjustment_status",
      });
    }
  });

  it("maps Dodo dispute loss states and restoration states", () => {
    const createdAt = new Date().toISOString();
    for (const [eventName, status, desired] of [
      ["dispute.opened", "dispute_opened", -49_900n],
      ["dispute.won", "dispute_won", 0n],
    ] as const) {
      const body = JSON.stringify({
        business_id: "mock_business",
        data: {
          amount: "49900",
          created_at: createdAt,
          currency: "INR",
          dispute_id: "dp_contract",
          dispute_status: status,
          payment_id: "pay_dispute_contract",
        },
        timestamp: createdAt,
        type: eventName,
      });
      expect(
        verifyAndNormalizeDodoWebhook(body, signedHeaders(body)),
      ).toMatchObject({
        adjustment: {
          amountPaise: 49_900n,
          desiredEffectiveDelta: desired,
          kind: "chargeback",
          status,
        },
      });
    }
  });

  it("quarantines an authentic adjustment whose event and payload disagree", () => {
    const createdAt = new Date().toISOString();
    const body = JSON.stringify({
      business_id: "mock_business",
      data: {
        amount: 20_000,
        created_at: createdAt,
        currency: "INR",
        payment_id: "pay_refund_contract",
        refund_id: "ref_mismatch",
        status: "failed",
      },
      timestamp: createdAt,
      type: "refund.succeeded",
    });
    expect(
      verifyAndNormalizeDodoWebhook(body, signedHeaders(body)),
    ).toMatchObject({ adjustment: null, normalizedType: "unknown" });
  });
});
