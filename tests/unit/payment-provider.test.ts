import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DodoPaymentsProvider } from "@/server/payments/dodo-provider";
import { MockDodoProvider } from "@/server/payments/mock-provider";

function request() {
  return {
    amountPaise: 49_900n,
    customer: {
      email: "owner@example.com",
      name: "Example",
      phone: "+919876543210",
    },
    publicAttemptId: `att_${"a".repeat(24)}`,
    requestId: randomUUID(),
    returnUrl: "https://goneviral.in/join/attempt/return",
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("Dodo Payments adapters", () => {
  it("reuses a deterministic mock session for an identical request", async () => {
    const provider = new MockDodoProvider("http://localhost:3000");
    const input = request();
    const first = await provider.createCheckout(input);
    const second = await provider.createCheckout(input);
    expect(first.kind).toBe("created");
    expect(second).toEqual({
      kind: "recovered",
      session: first.kind === "created" ? first.session : undefined,
    });
  });

  it("uses only Dodo test mode, minor units, and validated customer contact", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          checkout_url: "https://checkout.dodopayments.com/session/test",
          session_id: "session_test",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new DodoPaymentsProvider(
      "secret",
      "product",
    ).createCheckout(request());
    expect(result.kind).toBe("created");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://test.dodopayments.com/checkouts",
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.product_cart).toEqual([
      { amount: 49_900, product_id: "product", quantity: 1 },
    ]);
    expect(body.customer.phone_number).toBe("+919876543210");
  });

  it("rejects a tampered amount before calling Dodo", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const input = { ...request(), amountPaise: 49_901n };
    expect(
      await new DodoPaymentsProvider("secret", "product").createCheckout(input),
    ).toEqual({ kind: "rejected", safeCode: "invalid_amount" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry or claim recovery after an ambiguous Dodo timeout", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new DOMException("timed out", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new DodoPaymentsProvider("secret", "product");
    expect(await provider.createCheckout(request())).toEqual({
      kind: "uncertain",
    });
    expect(await provider.recoverCheckout("unknown")).toEqual({
      kind: "uncertain",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a checkout URL outside Dodo's domain", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            checkout_url: "https://evildodopayments.com/session",
            session_id: "session_test",
          }),
          { status: 200 },
        ),
      ),
    );
    expect(
      await new DodoPaymentsProvider("secret", "product").createCheckout(
        request(),
      ),
    ).toEqual({ kind: "uncertain" });
  });

  it("retrieves a known Dodo session without treating browser state as authority", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ id: "session_test", payment_status: "succeeded" }),
            { status: 200 },
          ),
        ),
    );
    expect(
      await new DodoPaymentsProvider("secret", "product").retrieveCheckout(
        "session_test",
      ),
    ).toEqual({ kind: "found", sessionId: "session_test", status: "paid" });
  });
});
