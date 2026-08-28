import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

import { handleDodoWebhook } from "@/app/api/webhooks/dodo/route";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";
import { getMockDodoWebhookSecretForTests } from "@/server/payments/dodo-webhook";

const publicAttemptPattern = /^att_[A-Za-z0-9_-]{24}$/;
const loopbackHosts = new Set(["127.0.0.1", "localhost"]);

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const configuredUrl = new URL(readPublicEnv().NEXT_PUBLIC_SITE_URL);
  if (
    readServerEnv().DODO_PAYMENTS_ENVIRONMENT !== "mock" ||
    !loopbackHosts.has(requestUrl.hostname) ||
    !loopbackHosts.has(configuredUrl.hostname)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const form = await request.formData();
  const publicId = form.get("publicId");
  if (typeof publicId !== "string" || !publicAttemptPattern.test(publicId)) {
    return new Response("Invalid request", { status: 400 });
  }

  const [attempt] = await getSqlClient()<
    {
      amount_paise: bigint;
      provider_order_id: string;
      state: string;
    }[]
  >`
    SELECT amount_paise, provider_order_id, state
    FROM private.payment_attempts
    WHERE public_id = ${publicId} AND provider_environment = 'mock'
    LIMIT 1
  `;
  if (!attempt?.provider_order_id) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const eventId = `mock_evt_${publicId}`;
  const body = JSON.stringify({
    business_id: "mock_business",
    data: {
      checkout_session_id: attempt.provider_order_id,
      created_at: now.toISOString(),
      currency: "INR",
      metadata: { attempt_public_id: publicId },
      payment_id: `mock_pay_${publicId}`,
      payment_method: "mock",
      payload_type: "Payment",
      status: "succeeded",
      total_amount: Number(attempt.amount_paise),
      updated_at: now.toISOString(),
    },
    timestamp: now.toISOString(),
    type: "payment.succeeded",
  });
  const webhook = new Webhook(getMockDodoWebhookSecretForTests());
  const webhookResponse = await handleDodoWebhook(
    new Request(`${requestUrl.origin}/api/webhooks/dodo`, {
      body,
      headers: {
        "content-type": "application/json",
        "webhook-id": eventId,
        "webhook-signature": webhook.sign(eventId, now, body),
        "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
      },
      method: "POST",
    }),
  );
  if (!webhookResponse.ok) {
    return new Response("Mock webhook failed", { status: 503 });
  }
  return NextResponse.redirect(
    new URL(`/join/${encodeURIComponent(publicId)}/pending`, requestUrl),
    303,
  );
}
