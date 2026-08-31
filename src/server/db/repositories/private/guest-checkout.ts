import "server-only";

import { getSqlClient } from "../../client";

const publicAttemptPattern = /^att_[A-Za-z0-9_-]{24}$/;

export type PublicAttemptStatus = Readonly<{
  amountPaise: bigint;
  estimatedRank: bigint | null;
  listingPath: string | null;
  listingName: string;
  mainRank: bigint | null;
  state: "confirmed" | "failed" | "pending" | "reversed";
}>;

export async function getPublicAttemptStatus(
  publicId: string,
): Promise<PublicAttemptStatus | null> {
  if (!publicAttemptPattern.test(publicId)) return null;
  const rows = await getSqlClient()<
    {
      amount_paise: bigint;
      estimated_rank: bigint | null;
      listing_name: string;
      listing_path: string | null;
      main_rank: bigint | null;
      net_amount_paise: bigint;
      state: string;
    }[]
  >`
    WITH ranked AS (
      SELECT id, row_number() OVER (
        ORDER BY confirmed_total_paise DESC,
                 current_total_reached_at ASC, id ASC
      ) AS main_rank
      FROM app.listings
      WHERE lifecycle_status = 'active'
        AND moderation_status = 'clear'
        AND confirmed_total_paise > 0
    )
    SELECT pa.amount_paise, pa.estimated_rank_snapshot AS estimated_rank,
           l.name AS listing_name, pa.state,
           COALESCE((
             SELECT sum(ledger.amount_delta_paise)
             FROM private.financial_ledger AS ledger
             WHERE ledger.payment_attempt_id = pa.id
           ), 0)::bigint AS net_amount_paise,
           CASE WHEN r.main_rank IS NOT NULL THEN '/l/' || l.slug ELSE NULL END
             AS listing_path,
           r.main_rank
    FROM private.payment_attempts pa
    JOIN app.listings l ON l.id = pa.listing_id
    LEFT JOIN ranked r ON r.id = l.id
    WHERE pa.public_id = ${publicId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    amountPaise: row.amount_paise,
    estimatedRank: row.estimated_rank,
    listingPath: row.listing_path,
    listingName: row.listing_name,
    mainRank: row.main_rank,
    state:
      row.state === "succeeded"
        ? row.net_amount_paise <= 0n
          ? "reversed"
          : "confirmed"
        : ["failed", "cancelled", "expired", "dropped"].includes(row.state)
          ? "failed"
          : "pending",
  };
}

export async function recordCustomerReturn(publicId: string): Promise<boolean> {
  if (!publicAttemptPattern.test(publicId)) return false;
  const rows = await getSqlClient()<{ public_id: string }[]>`
    UPDATE private.payment_attempts
    SET state = 'customer_returned', updated_at = now()
    WHERE public_id = ${publicId} AND state = 'checkout_ready'
    RETURNING public_id
  `;
  if (rows[0]) return true;
  return Boolean(await getPublicAttemptStatus(publicId));
}
