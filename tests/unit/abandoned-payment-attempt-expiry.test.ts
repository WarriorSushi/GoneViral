import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getSqlClient: () => query }));

import { expireAbandonedPaymentAttempts } from "@/server/payments/expire-abandoned-payment-attempts";

beforeEach(() => vi.clearAllMocks());

describe("abandoned payment-attempt expiry", () => {
  it("expires only checkout-bearing pending states whose checkout window elapsed", async () => {
    query.mockResolvedValueOnce([{ id: "first" }, { id: "second" }]);

    await expect(expireAbandonedPaymentAttempts()).resolves.toBe(2);

    const statement = query.mock.calls[0]![0]!.join(" ").replaceAll(
      /\s+/g,
      " ",
    );
    expect(statement).toContain("UPDATE private.payment_attempts");
    expect(statement).toContain("SET state = 'expired'");
    expect(statement).toContain(
      "state IN ('checkout_ready', 'customer_returned', 'provider_pending')",
    );
    expect(statement).toContain(
      "checkout_expires_at <= transaction_timestamp()",
    );
    expect(statement).toContain("RETURNING id");
    expect(statement).not.toMatch(/intent_created|provider_order_pending/);
  });

  it("is a count-only no-op when no eligible attempts remain", async () => {
    query.mockResolvedValueOnce([]);
    await expect(expireAbandonedPaymentAttempts()).resolves.toBe(0);
  });
});
