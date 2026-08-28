import "server-only";

import { getSqlClient } from "@/server/db/client";
import { submissionDigest } from "@/server/security/submission-security";

export function canonicalizeOwnerEmail(email: string): string {
  return email.trim().normalize("NFKC").toLowerCase();
}

type PendingOwner = { id: string; listing_id: string };

export async function claimPendingListingsForVerifiedUser(input: {
  email: string;
  userId: string;
}): Promise<readonly string[]> {
  const canonicalEmail = canonicalizeOwnerEmail(input.email);
  const emailHash = submissionDigest(canonicalEmail);
  const sql = getSqlClient();

  return sql.begin(async (transaction) => {
    const pendingOwners = await transaction<PendingOwner[]>`
      SELECT pending.id, pending.listing_id
      FROM private.pending_listing_owners AS pending
      JOIN private.payment_attempts AS attempt
        ON attempt.id = pending.created_from_attempt_id
       AND attempt.pending_owner_id = pending.id
       AND attempt.purpose = 'initial_sponsorship'
       AND attempt.state = 'succeeded'
      WHERE pending.email_hash = ${emailHash}
        AND pending.canonical_email = ${canonicalEmail}
        AND pending.claim_state = 'pending'
      ORDER BY pending.created_at, pending.id
      FOR UPDATE OF pending
    `;

    const claimed: string[] = [];
    for (const pending of pendingOwners) {
      const activeOwner = await transaction<{ user_id: string }[]>`
        SELECT user_id
        FROM private.listing_owners
        WHERE listing_id = ${pending.listing_id}
          AND revoked_at IS NULL
        FOR UPDATE
      `;

      if (activeOwner[0] && activeOwner[0].user_id !== input.userId) continue;

      if (!activeOwner[0]) {
        const inserted = await transaction<{ listing_id: string }[]>`
          INSERT INTO private.listing_owners (
            listing_id, user_id, role, created_by
          ) VALUES (
            ${pending.listing_id}, ${input.userId}, 'owner', ${input.userId}
          )
          ON CONFLICT (listing_id, user_id) DO NOTHING
          RETURNING listing_id
        `;
        if (!inserted[0]) continue;
      }

      const updated = await transaction<{ listing_id: string }[]>`
        UPDATE private.pending_listing_owners
        SET claim_state = 'claimed', claimed_by_user_id = ${input.userId},
            claimed_at = transaction_timestamp(),
            updated_at = transaction_timestamp()
        WHERE id = ${pending.id} AND claim_state = 'pending'
        RETURNING listing_id
      `;
      if (updated[0]) claimed.push(updated[0].listing_id);
    }
    return claimed;
  });
}
