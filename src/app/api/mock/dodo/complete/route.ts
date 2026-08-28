import { Webhook } from "standardwebhooks";

import { handleDodoWebhook } from "@/app/api/webhooks/dodo/route";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";
import { getMockDodoWebhookSecretForTests } from "@/server/payments/dodo-webhook";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { findActiveListingOwner } from "@/server/db/repositories/private/owners";

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
      listing_id: string;
      listing_slug: string;
      purpose: string;
      provider_order_id: string;
      requested_by_user_id: string | null;
      state: string;
    }[]
  >`
    SELECT attempt.amount_paise, attempt.listing_id, attempt.provider_order_id, attempt.state,
           attempt.purpose, attempt.requested_by_user_id,
           listing.slug AS listing_slug
    FROM private.payment_attempts AS attempt
    JOIN app.listings AS listing ON listing.id = attempt.listing_id
    WHERE attempt.public_id = ${publicId} AND attempt.provider_environment = 'mock'
    LIMIT 1
  `;
  if (!attempt?.provider_order_id) {
    return new Response("Not found", { status: 404 });
  }
  if (attempt.purpose === "raise") {
    const user = await getVerifiedAuthUser();
    const activeOwner = user
      ? await findActiveListingOwner(attempt.listing_id, user.id)
      : null;
    if (!user || user.id !== attempt.requested_by_user_id || !activeOwner) {
      return new Response("Not found", { status: 404 });
    }
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
  const pendingPath =
    attempt.purpose === "raise"
      ? `/manage/${encodeURIComponent(attempt.listing_slug)}/raise/${encodeURIComponent(publicId)}/pending`
      : `/join/${encodeURIComponent(publicId)}/pending`;
  return new Response(null, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Location: pendingPath,
    },
    status: 303,
  });
}
