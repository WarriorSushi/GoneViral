import "server-only";

import { Webhook } from "standardwebhooks";
import { z } from "zod";

import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";

const deliveryEventSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({ email_id: z.string().min(1).max(200) }).passthrough(),
  type: z.enum([
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.suppressed",
  ]),
});

export type ResendDeliveryEvent = Readonly<{
  eventId: string;
  occurredAt: Date;
  providerMessageId: string;
  type: z.infer<typeof deliveryEventSchema>["type"];
}>;

export function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
): ResendDeliveryEvent {
  const secret = readServerEnv().RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error("resend_webhook_not_configured");
  const eventId = headers.get("svix-id") ?? headers.get("webhook-id");
  const timestamp =
    headers.get("svix-timestamp") ?? headers.get("webhook-timestamp");
  const signature =
    headers.get("svix-signature") ?? headers.get("webhook-signature");
  if (!eventId || !timestamp || !signature) {
    throw new Error("resend_webhook_headers_missing");
  }
  const verified = new Webhook(secret).verify(rawBody, {
    "webhook-id": eventId,
    "webhook-signature": signature,
    "webhook-timestamp": timestamp,
  });
  const event = deliveryEventSchema.parse(verified);
  return {
    eventId,
    occurredAt: new Date(event.created_at),
    providerMessageId: event.data.email_id,
    type: event.type,
  };
}

function deliveryState(type: ResendDeliveryEvent["type"]) {
  return type.replace("email.", "").replace("delivery_", "") as
    | "bounced"
    | "complained"
    | "delayed"
    | "delivered"
    | "failed"
    | "sent"
    | "suppressed";
}

export async function processResendDeliveryEvent(event: ResendDeliveryEvent) {
  return getSqlClient().begin(async (transaction) => {
    const [outbox] = await transaction<
      { delivery_state: string; delivery_updated_at: Date | null; id: string }[]
    >`
      SELECT id, delivery_state, delivery_updated_at FROM private.email_outbox
      WHERE provider_message_id = ${event.providerMessageId}
      FOR UPDATE
    `;
    const inserted = await transaction<{ event_id: string }[]>`
      INSERT INTO private.email_provider_events (
        event_id, outbox_id, provider_message_id, event_type, occurred_at
      ) VALUES (
        ${event.eventId}, ${outbox?.id ?? null}, ${event.providerMessageId},
        ${event.type}, ${event.occurredAt}
      ) ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `;
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    if (!outbox) return { kind: "unmatched" } as const;

    const next = deliveryState(event.type);
    const priority: Record<string, number> = {
      accepted: 0,
      queued: 0,
      sent: 1,
      delayed: 2,
      failed: 3,
      delivered: 4,
      bounced: 5,
      complained: 5,
      suppressed: 5,
    };
    const shouldApply =
      (priority[next] ?? 0) > (priority[outbox.delivery_state] ?? 0) ||
      ((priority[next] ?? 0) === (priority[outbox.delivery_state] ?? 0) &&
        (!outbox.delivery_updated_at ||
          event.occurredAt >= outbox.delivery_updated_at));
    if (shouldApply) {
      const failureCode = new Set([
        "bounced",
        "complained",
        "failed",
        "suppressed",
      ]).has(next)
        ? `resend_delivery_${next}`
        : null;
      await transaction`
        UPDATE private.email_outbox
        SET delivery_state = ${next}, delivery_updated_at = ${event.occurredAt},
            last_error_code = COALESCE(${failureCode}, last_error_code)
        WHERE id = ${outbox.id}
      `;
    }
    return { kind: "processed" } as const;
  });
}
