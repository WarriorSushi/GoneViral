import "server-only";

import { readPublicEnv } from "@/config/env/public";
import { getSqlClient } from "@/server/db/client";
import { decryptPrivateText } from "@/server/security/private-data";

import {
  EmailProviderError,
  getEmailDeliveryProvider,
  type EmailDeliveryProvider,
} from "./provider";
import { renderEmailTemplate, type EmailTemplateKind } from "./templates";

const MAX_ATTEMPTS = 5;
const RETRY_SECONDS = [60, 300, 900, 3_600, 14_400] as const;

type ClaimedEmail = Readonly<{
  attemptCount: number;
  id: string;
  idempotencyKey: string;
  kind: EmailTemplateKind;
  payload: Record<string, unknown>;
  recipientEncrypted: string;
  templateVersion: string;
}>;

async function claimEmailBatch(limit: number): Promise<ClaimedEmail[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25) {
    throw new RangeError("Email batch limit must be from 1 to 25.");
  }
  return getSqlClient().begin(
    (transaction) => transaction<ClaimedEmail[]>`
    WITH selected AS (
      SELECT id
      FROM private.email_outbox
      WHERE state IN ('pending', 'failed_retryable', 'sending')
        AND next_attempt_at <= transaction_timestamp()
      ORDER BY next_attempt_at ASC, created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE private.email_outbox AS outbox
    SET state = 'sending', attempt_count = outbox.attempt_count + 1,
        next_attempt_at = transaction_timestamp() + interval '10 minutes',
        last_error_code = NULL
    FROM selected
    WHERE outbox.id = selected.id
    RETURNING outbox.id, outbox.kind, outbox.recipient_encrypted AS "recipientEncrypted",
              outbox.template_version AS "templateVersion", outbox.payload,
              outbox.idempotency_key AS "idempotencyKey",
              outbox.attempt_count AS "attemptCount"
  `,
  );
}

async function claimEmailById(id: string): Promise<ClaimedEmail[]> {
  return getSqlClient().begin(
    (transaction) => transaction<ClaimedEmail[]>`
    WITH selected AS (
      SELECT id
      FROM private.email_outbox
      WHERE id = ${id}
        AND state IN ('pending', 'failed_retryable', 'sending')
        AND next_attempt_at <= transaction_timestamp()
      FOR UPDATE SKIP LOCKED
    )
    UPDATE private.email_outbox AS outbox
    SET state = 'sending', attempt_count = outbox.attempt_count + 1,
        next_attempt_at = transaction_timestamp() + interval '10 minutes',
        last_error_code = NULL
    FROM selected
    WHERE outbox.id = selected.id
    RETURNING outbox.id, outbox.kind, outbox.recipient_encrypted AS "recipientEncrypted",
              outbox.template_version AS "templateVersion", outbox.payload,
              outbox.idempotency_key AS "idempotencyKey",
              outbox.attempt_count AS "attemptCount"
  `,
  );
}

async function markSent(id: string, providerMessageId: string) {
  await getSqlClient()`
    UPDATE private.email_outbox
    SET state = 'sent', provider_message_id = ${providerMessageId},
        sent_at = COALESCE(sent_at, transaction_timestamp()),
        delivery_state = 'accepted',
        delivery_updated_at = transaction_timestamp(),
        last_error_code = NULL, next_attempt_at = transaction_timestamp()
    WHERE id = ${id} AND state = 'sending'
  `;
}

async function markFailed(
  email: ClaimedEmail,
  failure: { code: string; retryable: boolean },
) {
  const retryable = failure.retryable && email.attemptCount < MAX_ATTEMPTS;
  const delay =
    RETRY_SECONDS[Math.min(email.attemptCount - 1, RETRY_SECONDS.length - 1)] ??
    RETRY_SECONDS.at(-1)!;
  await getSqlClient()`
    UPDATE private.email_outbox
    SET state = ${retryable ? "failed_retryable" : "dead_letter"},
        last_error_code = ${failure.code.slice(0, 180)},
        next_attempt_at = ${new Date(Date.now() + delay * 1_000)},
        delivery_state = CASE
          WHEN provider_message_id IS NULL THEN 'queued'
          ELSE delivery_state
        END
    WHERE id = ${email.id} AND state = 'sending'
  `;
}

async function deliverClaimedEmails(
  emails: ClaimedEmail[],
  provider: EmailDeliveryProvider,
) {
  const siteUrl = readPublicEnv().NEXT_PUBLIC_SITE_URL;
  let sent = 0;
  let retryable = 0;
  let deadLetter = 0;

  for (const email of emails) {
    try {
      const rendered = renderEmailTemplate({
        kind: email.kind,
        payload: email.payload,
        siteUrl,
        templateVersion: email.templateVersion,
      });
      const result = await provider.send({
        idempotencyKey: `goneviral-email/${email.id}`,
        message: {
          ...rendered,
          to: decryptPrivateText(email.recipientEncrypted),
        },
      });
      await markSent(email.id, result.providerMessageId);
      sent += 1;
    } catch (error) {
      const failure =
        error instanceof EmailProviderError
          ? { code: error.code, retryable: error.retryable }
          : { code: "email_render_or_worker_error", retryable: false };
      await markFailed(email, failure);
      if (failure.retryable && email.attemptCount < MAX_ATTEMPTS)
        retryable += 1;
      else deadLetter += 1;
    }
  }
  return { claimed: emails.length, deadLetter, retryable, sent } as const;
}

export async function deliverEmailOutboxById(
  id: string,
  provider: EmailDeliveryProvider = getEmailDeliveryProvider(),
) {
  return deliverClaimedEmails(await claimEmailById(id), provider);
}

export async function drainEmailOutbox(
  input: {
    limit?: number;
    provider?: EmailDeliveryProvider;
  } = {},
) {
  return deliverClaimedEmails(
    await claimEmailBatch(input.limit ?? 10),
    input.provider ?? getEmailDeliveryProvider(),
  );
}
