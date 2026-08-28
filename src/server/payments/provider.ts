import "server-only";

export type CheckoutRequest = Readonly<{
  amountPaise: bigint;
  customer: Readonly<{ email: string; name: string; phone: string }>;
  publicAttemptId: string;
  requestId: string;
  returnUrl: string;
}>;

export type CheckoutSession = Readonly<{
  checkoutUrl: string;
  createdAt: Date;
  sessionId: string;
}>;

export type CheckoutCreation =
  | Readonly<{ kind: "created" | "recovered"; session: CheckoutSession }>
  | Readonly<{ kind: "rejected"; safeCode: string }>
  | Readonly<{ kind: "uncertain" }>;

export type CheckoutLookup =
  | Readonly<{
      kind: "found";
      sessionId: string;
      status: "failed" | "paid" | "pending";
    }>
  | Readonly<{ kind: "not_found" | "uncertain" }>;

export interface PaymentProvider {
  readonly environment: "mock" | "test_mode";
  readonly name: "dodo";
  createCheckout(request: CheckoutRequest): Promise<CheckoutCreation>;
  recoverCheckout(requestId: string): Promise<CheckoutCreation>;
  retrieveCheckout(sessionId: string): Promise<CheckoutLookup>;
}
