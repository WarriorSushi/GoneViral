import "server-only";

import { z } from "zod";

import {
  INITIAL_SPONSORSHIP_MAX_PAISE,
  INITIAL_SPONSORSHIP_MIN_PAISE,
} from "@/domain/policy";

import type {
  CheckoutCreation,
  CheckoutLookup,
  CheckoutRequest,
  PaymentProvider,
} from "./provider";

const dodoResponseSchema = z.object({
  checkout_url: z.url({ protocol: /^https$/ }),
  session_id: z.string().min(1).max(200),
});

const dodoRetrieveSchema = z.object({
  id: z.string().min(1).max(200),
  payment_status: z.string().optional(),
});

export class DodoPaymentsProvider implements PaymentProvider {
  readonly environment = "test_mode" as const;
  readonly name = "dodo" as const;

  constructor(
    private readonly apiKey: string,
    private readonly productId: string,
  ) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutCreation> {
    if (
      request.amountPaise < INITIAL_SPONSORSHIP_MIN_PAISE ||
      request.amountPaise > INITIAL_SPONSORSHIP_MAX_PAISE ||
      request.amountPaise % 100n !== 0n
    ) {
      return { kind: "rejected", safeCode: "invalid_amount" };
    }
    try {
      // Dodo does not currently document idempotent checkout creation. Do not
      // automatically retry an ambiguous POST; doing so could create two
      // provider sessions for one application attempt.
      const response = await fetch("https://test.dodopayments.com/checkouts", {
        body: JSON.stringify({
          billing_currency: "INR",
          customer: {
            email: request.customer.email,
            name: request.customer.name,
            phone_number: request.customer.phone,
          },
          feature_flags: {
            allow_customer_editing_email: false,
            allow_discount_code: false,
            allow_phone_number_collection: true,
            require_phone_number: true,
          },
          metadata: {
            attempt_public_id: request.publicAttemptId,
            application_request_id: request.requestId,
          },
          product_cart: [
            {
              amount: Number(request.amountPaise),
              product_id: this.productId,
              quantity: 1,
            },
          ],
          return_url: request.returnUrl,
        }),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return response.status >= 500
          ? { kind: "uncertain" }
          : { kind: "rejected", safeCode: "provider_rejected" };
      }
      const payload = dodoResponseSchema.safeParse(await response.json());
      if (!payload.success) return { kind: "uncertain" };
      const checkout = new URL(payload.data.checkout_url);
      if (
        checkout.hostname !== "dodopayments.com" &&
        !checkout.hostname.endsWith(".dodopayments.com")
      ) {
        return { kind: "uncertain" };
      }
      return {
        kind: "created",
        session: {
          checkoutUrl: checkout.toString(),
          createdAt: new Date(),
          sessionId: payload.data.session_id,
        },
      };
    } catch {
      return { kind: "uncertain" };
    }
  }

  async recoverCheckout(_requestId: string): Promise<CheckoutCreation> {
    void _requestId;
    // Dodo can retrieve a known session id, but its public API currently has no
    // lookup by our request id after a response-less timeout.
    return { kind: "uncertain" };
  }

  async retrieveCheckout(sessionId: string): Promise<CheckoutLookup> {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId)) {
      return { kind: "not_found" };
    }
    try {
      const response = await fetch(
        `https://test.dodopayments.com/checkouts/${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          method: "GET",
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (response.status === 404) return { kind: "not_found" };
      if (!response.ok) return { kind: "uncertain" };
      const payload = dodoRetrieveSchema.safeParse(await response.json());
      if (!payload.success || payload.data.id !== sessionId) {
        return { kind: "uncertain" };
      }
      const providerStatus = payload.data.payment_status?.toLowerCase();
      const status =
        providerStatus === "succeeded"
          ? "paid"
          : providerStatus === "failed" || providerStatus === "cancelled"
            ? "failed"
            : "pending";
      return { kind: "found", sessionId, status };
    } catch {
      return { kind: "uncertain" };
    }
  }
}
