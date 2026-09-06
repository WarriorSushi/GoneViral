export type PaymentMode = "live_mode" | "mock" | "test_mode";

export function paymentStatus(
  mode: PaymentMode,
  deploymentEnabled: boolean,
  databaseEnabled: boolean,
) {
  const appEnabled = mode === "mock" || deploymentEnabled;
  const active = appEnabled && databaseEnabled;
  const kind =
    mode === "live_mode" ? "live" : mode === "test_mode" ? "test" : "mock";

  return { active, appEnabled, kind } as const;
}
