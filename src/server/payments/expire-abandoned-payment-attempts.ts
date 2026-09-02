import "server-only";

import { getSqlClient } from "@/server/db/client";

/**
 * Applies local checkout expiry without treating it as provider failure.
 * A later authentic provider success may still supersede this state.
 */
export async function expireAbandonedPaymentAttempts(): Promise<number> {
  const rows = await getSqlClient()<{ id: string }[]>`
    UPDATE private.payment_attempts
    SET state = 'expired', expired_at = transaction_timestamp(),
        updated_at = transaction_timestamp()
    WHERE state IN ('checkout_ready', 'customer_returned', 'provider_pending')
      AND checkout_expires_at <= transaction_timestamp()
    RETURNING id
  `;
  return rows.length;
}
