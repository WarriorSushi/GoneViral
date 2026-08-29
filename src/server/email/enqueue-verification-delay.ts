import "server-only";

import { getSqlClient } from "@/server/db/client";
import { encryptPrivateText } from "@/server/security/private-data";
import { submissionDigest } from "@/server/security/submission-security";

import { EMAIL_TEMPLATE_VERSION } from "./templates";

export async function enqueueVerificationDelayIfDue(attemptPublicId: string) {
  if (!/^att_[A-Za-z0-9_-]{24}$/.test(attemptPublicId)) return false;
  const inserted = await getSqlClient().begin(async (transaction) => {
    const [attempt] = await transaction<
      {
        canonical_email: string;
        email_hash: string;
        id: string;
        listing_name: string;
        listing_public_id: string;
      }[]
    >`
      SELECT attempt.id, listing.name AS listing_name,
             listing.public_id AS listing_public_id,
             COALESCE(pending.canonical_email, lower(auth_user.email)) AS canonical_email,
             COALESCE(pending.email_hash, '') AS email_hash
      FROM private.payment_attempts AS attempt
      JOIN app.listings AS listing ON listing.id = attempt.listing_id
      LEFT JOIN private.pending_listing_owners AS pending
        ON pending.id = attempt.pending_owner_id
      LEFT JOIN auth.users AS auth_user
        ON auth_user.id = attempt.requested_by_user_id
      WHERE attempt.public_id = ${attemptPublicId}
        AND attempt.state IN (
          'intent_created', 'provider_creating', 'checkout_ready',
          'customer_returned', 'provider_pending'
        )
        AND attempt.created_at <= transaction_timestamp() - interval '15 minutes'
        AND COALESCE(pending.canonical_email, lower(auth_user.email)) IS NOT NULL
      LIMIT 1
      FOR UPDATE OF attempt
    `;
    if (!attempt) return [];
    return transaction<{ id: string }[]>`
      INSERT INTO private.email_outbox (
        kind, recipient_encrypted, recipient_hash, template_version, payload,
        idempotency_key, state, next_attempt_at
      ) VALUES (
        'verification_delay', ${encryptPrivateText(attempt.canonical_email)},
        ${attempt.email_hash || submissionDigest(attempt.canonical_email)},
        ${EMAIL_TEMPLATE_VERSION},
        (${JSON.stringify({
          attemptPublicId,
          listingName: attempt.listing_name,
          listingPublicId: attempt.listing_public_id,
        })}::jsonb #>> '{}')::jsonb,
        ${`verification-delay:${attempt.id}:${EMAIL_TEMPLATE_VERSION}`},
        'pending', transaction_timestamp()
      ) ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    `;
  });
  return inserted.length > 0;
}
