import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_STATUSES,
  MODERATION_STATUSES,
  canTransitionLifecycle,
  canTransitionModeration,
  isPublicEligible,
  publicEligibilityErrors,
  validateLifecycleTransition,
  validateModerationTransition,
} from "@/domain/listing";
import { moneyPaise, parseWholeInr } from "@/domain/money";
import {
  PAYMENT_ATTEMPT_STATES,
  PROVIDER_PAYMENT_STATUSES,
  canTransitionAttempt,
  createAttemptPolicySnapshot,
  isSuccessfullyFulfilledAttempt,
  mergeProviderPaymentStatus,
  normalizeProviderPaymentStatus,
  transitionAttempt,
  type PaymentAttemptState,
} from "@/domain/payment";
import { POLICY_VERSION } from "@/domain/policy";

function inr(rupees: string) {
  const parsed = parseWholeInr(rupees);

  if (!parsed.ok) {
    throw new Error(parsed.code);
  }

  return parsed.value;
}

describe("listing lifecycle and moderation", () => {
  it("matches the complete lifecycle transition matrix", () => {
    const allowed: Readonly<Record<string, readonly string[]>> = {
      draft: ["payment_pending"],
      payment_pending: ["draft", "active"],
      active: ["inactive_reversed", "removed"],
      inactive_reversed: ["active", "removed"],
      removed: [],
    };

    for (const from of LIFECYCLE_STATUSES) {
      for (const to of LIFECYCLE_STATUSES) {
        expect(canTransitionLifecycle(from, to)).toBe(
          allowed[from]!.includes(to),
        );
      }
    }

    expect(validateLifecycleTransition("draft", "payment_pending")).toEqual({
      ok: true,
      value: "payment_pending",
    });
    expect(validateLifecycleTransition("removed", "active")).toEqual({
      ok: false,
      code: "LISTING_LIFECYCLE_TRANSITION_NOT_ALLOWED",
    });
  });

  it("matches the complete moderation transition matrix", () => {
    const allowed: Readonly<Record<string, readonly string[]>> = {
      unreviewed: ["clear", "pending_review"],
      pending_review: ["clear", "suspended"],
      clear: ["suspended"],
      suspended: ["clear"],
    };

    for (const from of MODERATION_STATUSES) {
      for (const to of MODERATION_STATUSES) {
        expect(canTransitionModeration(from, to)).toBe(
          allowed[from]!.includes(to),
        );
      }
    }

    expect(validateModerationTransition("clear", "suspended")).toEqual({
      ok: true,
      value: "suspended",
    });
    expect(validateModerationTransition("suspended", "pending_review")).toEqual(
      {
        ok: false,
        code: "LISTING_MODERATION_TRANSITION_NOT_ALLOWED",
      },
    );
  });

  it("proves the public eligibility predicate over the full state matrix", () => {
    const totals = [moneyPaise(0n), inr("499")];
    const destinationStates = [false, true];

    for (const lifecycleStatus of LIFECYCLE_STATUSES) {
      for (const moderationStatus of MODERATION_STATUSES) {
        for (const confirmedTotalPaise of totals) {
          for (const hasSafeApprovedDestination of destinationStates) {
            const expected =
              lifecycleStatus === "active" &&
              moderationStatus === "clear" &&
              confirmedTotalPaise > 0n &&
              hasSafeApprovedDestination;
            const listing = {
              lifecycleStatus,
              moderationStatus,
              confirmedTotalPaise,
              hasSafeApprovedDestination,
            };

            expect(isPublicEligible(listing)).toBe(expected);
            expect(publicEligibilityErrors(listing).length === 0).toBe(
              expected,
            );
          }
        }
      }
    }
  });
});

describe("payment attempt and provider status policy", () => {
  const allowedAttemptTransitions: Readonly<
    Record<PaymentAttemptState, readonly PaymentAttemptState[]>
  > = {
    intent_created: ["provider_order_pending"],
    provider_order_pending: ["checkout_ready", "quarantined"],
    checkout_ready: [
      "customer_returned",
      "provider_pending",
      "succeeded",
      "failed",
      "dropped",
      "expired",
      "quarantined",
    ],
    customer_returned: [
      "provider_pending",
      "succeeded",
      "failed",
      "dropped",
      "expired",
      "quarantined",
    ],
    provider_pending: [
      "succeeded",
      "failed",
      "dropped",
      "expired",
      "quarantined",
    ],
    succeeded: ["succeeded"],
    failed: ["succeeded", "quarantined"],
    dropped: ["succeeded", "quarantined"],
    expired: ["succeeded", "quarantined"],
    quarantined: ["succeeded", "failed", "duplicate_paid", "cancelled"],
    duplicate_paid: [],
    cancelled: [],
  };

  it("matches the complete payment-attempt transition matrix", () => {
    for (const from of PAYMENT_ATTEMPT_STATES) {
      for (const to of PAYMENT_ATTEMPT_STATES) {
        expect(canTransitionAttempt(from, to)).toBe(
          allowedAttemptTransitions[from].includes(to),
        );
      }
    }
  });

  it("allows delayed success but never lets success regress", () => {
    for (const prior of ["failed", "dropped", "expired"] as const) {
      expect(transitionAttempt(prior, "succeeded")).toEqual({
        ok: true,
        value: {
          from: prior,
          to: "succeeded",
          becameSucceeded: true,
          isIdempotentRepeat: false,
        },
      });
    }

    for (const regression of ["failed", "dropped", "expired"] as const) {
      expect(transitionAttempt("succeeded", regression)).toEqual({
        ok: false,
        code: "PAYMENT_ATTEMPT_TRANSITION_NOT_ALLOWED",
      });
    }
  });

  it("models browser return as non-settlement and duplicate success as no new success", () => {
    expect(isSuccessfullyFulfilledAttempt("customer_returned")).toBe(false);
    expect(transitionAttempt("succeeded", "succeeded")).toEqual({
      ok: true,
      value: {
        from: "succeeded",
        to: "succeeded",
        becameSucceeded: false,
        isIdempotentRepeat: true,
      },
    });
  });

  it("creates immutable policy snapshots and rejects invalid attempts", () => {
    expect(
      createAttemptPolicySnapshot({
        purpose: "raise",
        amountPaise: inr("1001"),
        minimumRequiredPaise: inr("1001"),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({
      ok: true,
      value: {
        purpose: "raise",
        amountPaise: inr("1001"),
        minimumRequiredPaise: inr("1001"),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      },
    });
    expect(
      createAttemptPolicySnapshot({
        purpose: "raise",
        amountPaise: inr("1000"),
        minimumRequiredPaise: inr("1001"),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({
      ok: false,
      code: "PAYMENT_AMOUNT_BELOW_MINIMUM_SNAPSHOT",
    });
    expect(
      createAttemptPolicySnapshot({
        purpose: "raise",
        amountPaise: moneyPaise(100_050n),
        minimumRequiredPaise: inr("1000"),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({
      ok: false,
      code: "PAYMENT_AMOUNT_NOT_WHOLE_RUPEE",
    });
    expect(
      createAttemptPolicySnapshot({
        purpose: "raise",
        amountPaise: inr("1000"),
        minimumRequiredPaise: moneyPaise(0n),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({
      ok: false,
      code: "PAYMENT_MINIMUM_SNAPSHOT_NOT_POSITIVE",
    });
    expect(
      createAttemptPolicySnapshot({
        purpose: "raise",
        amountPaise: inr("1000"),
        minimumRequiredPaise: moneyPaise(99_950n),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({
      ok: false,
      code: "PAYMENT_MINIMUM_SNAPSHOT_NOT_WHOLE_RUPEE",
    });
    expect(
      createAttemptPolicySnapshot({
        purpose: "initial_sponsorship",
        amountPaise: moneyPaise(0n),
        minimumRequiredPaise: inr("499"),
        currency: "INR",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({ ok: false, code: "PAYMENT_AMOUNT_NOT_POSITIVE" });
    expect(
      createAttemptPolicySnapshot({
        purpose: "initial_sponsorship",
        amountPaise: inr("499"),
        minimumRequiredPaise: inr("499"),
        currency: "USD",
        policyVersion: POLICY_VERSION,
      }),
    ).toEqual({ ok: false, code: "PAYMENT_CURRENCY_UNSUPPORTED" });
    expect(
      createAttemptPolicySnapshot({
        purpose: "initial_sponsorship",
        amountPaise: inr("499"),
        minimumRequiredPaise: inr("499"),
        currency: "INR",
        policyVersion: "future-policy",
      }),
    ).toEqual({ ok: false, code: "PAYMENT_POLICY_VERSION_UNSUPPORTED" });
  });

  it("keeps provider success monotonic for every later observation", () => {
    for (const observed of PROVIDER_PAYMENT_STATUSES) {
      const merged = mergeProviderPaymentStatus("succeeded", observed);
      expect(merged.status).toBe("succeeded");
      expect(merged.changed).toBe(false);
    }

    for (const current of PROVIDER_PAYMENT_STATUSES) {
      expect(mergeProviderPaymentStatus(current, "succeeded").status).toBe(
        "succeeded",
      );
    }

    expect(mergeProviderPaymentStatus("pending", "failed")).toEqual({
      status: "failed",
      changed: true,
      ignoredRegression: false,
      requiresReview: false,
    });
    expect(mergeProviderPaymentStatus("failed", "pending")).toEqual({
      status: "failed",
      changed: false,
      ignoredRegression: true,
      requiresReview: false,
    });
    expect(mergeProviderPaymentStatus("failed", "dropped")).toEqual({
      status: "failed",
      changed: false,
      ignoredRegression: false,
      requiresReview: true,
    });
  });

  it("never maps an unknown provider status to success", () => {
    const mapping = {
      PAYMENT_PENDING: "pending",
      SUCCESS: "succeeded",
    } as const;

    expect(normalizeProviderPaymentStatus("SUCCESS", mapping)).toEqual({
      ok: true,
      value: "succeeded",
    });
    expect(
      normalizeProviderPaymentStatus("NEW_FUTURE_STATUS", mapping),
    ).toEqual({
      ok: false,
      code: "PAYMENT_PROVIDER_STATUS_UNKNOWN",
    });
  });
});
