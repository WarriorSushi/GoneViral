import "server-only";

import { getSqlClient } from "../../client";

const publicAttemptPattern = /^att_[A-Za-z0-9_-]{24}$/;

export type PublicAttemptStatus = Readonly<{
  amountPaise: bigint;
  listingName: string;
  state: "failed" | "pending";
}>;

export async function getPublicAttemptStatus(
  publicId: string,
): Promise<PublicAttemptStatus | null> {
  if (!publicAttemptPattern.test(publicId)) return null;
  const rows = await getSqlClient()<
    { amount_paise: bigint; listing_name: string; state: string }[]
  >`
    SELECT pa.amount_paise, l.name AS listing_name, pa.state
    FROM private.payment_attempts pa
    JOIN app.listings l ON l.id = pa.listing_id
    WHERE pa.public_id = ${publicId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    amountPaise: row.amount_paise,
    listingName: row.listing_name,
    state: ["failed", "cancelled", "expired", "dropped"].includes(row.state)
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
