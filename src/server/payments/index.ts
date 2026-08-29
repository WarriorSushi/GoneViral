import "server-only";

import { readServerEnv } from "@/config/env/server";

import { DodoPaymentsProvider } from "./dodo-provider";
import { MockDodoProvider } from "./mock-provider";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(siteUrl: string): PaymentProvider {
  const environment = readServerEnv();
  if (environment.DODO_PAYMENTS_ENVIRONMENT === "mock") {
    const hostname = new URL(siteUrl).hostname;
    if (!new Set(["127.0.0.1", "localhost"]).has(hostname)) {
      throw new Error(
        "The mock payment provider is restricted to loopback hosts.",
      );
    }
    return new MockDodoProvider(siteUrl);
  }
  return new DodoPaymentsProvider(
    environment.DODO_PAYMENTS_API_KEY!,
    environment.DODO_PAYMENTS_PRODUCT_ID!,
    environment.DODO_PAYMENTS_ENVIRONMENT,
  );
}
