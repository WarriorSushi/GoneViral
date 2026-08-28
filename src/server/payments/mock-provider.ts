import "server-only";

import type {
  CheckoutCreation,
  CheckoutRequest,
  CheckoutSession,
  CheckoutLookup,
  PaymentProvider,
} from "./provider";

const sessions = new Map<string, CheckoutSession>();

export class MockDodoProvider implements PaymentProvider {
  readonly environment = "mock" as const;
  readonly name = "dodo" as const;

  constructor(private readonly siteUrl: string) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutCreation> {
    const existing = sessions.get(request.requestId);
    if (existing) return { kind: "recovered", session: existing };

    const returnUrl = new URL(request.returnUrl);
    const checkoutPath = returnUrl.pathname.startsWith("/manage/")
      ? returnUrl.pathname.replace(/\/return$/, "/mock-checkout")
      : `/join/${encodeURIComponent(request.publicAttemptId)}/mock-checkout`;
    const session: CheckoutSession = {
      checkoutUrl: `${this.siteUrl}${checkoutPath}`,
      createdAt: new Date(),
      sessionId: `mock_${request.requestId}`,
    };
    sessions.set(request.requestId, session);
    return { kind: "created", session };
  }

  async recoverCheckout(requestId: string): Promise<CheckoutCreation> {
    const session = sessions.get(requestId);
    return session ? { kind: "recovered", session } : { kind: "uncertain" };
  }

  async retrieveCheckout(sessionId: string): Promise<CheckoutLookup> {
    const found = [...sessions.values()].some(
      (session) => session.sessionId === sessionId,
    );
    return found
      ? { kind: "found", sessionId, status: "pending" }
      : { kind: "not_found" };
  }
}
