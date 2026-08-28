import { isWholeRupee, type MoneyPaise } from "./money";
import {
  CURRENCY,
  POLICY_VERSION,
  type PolicyVersion,
  type SupportedCurrency,
} from "./policy";
import { domainFailure, domainSuccess, type DomainResult } from "./result";

export const PAYMENT_ATTEMPT_STATES = [
  "intent_created",
  "provider_order_pending",
  "checkout_ready",
  "customer_returned",
  "provider_pending",
  "succeeded",
  "failed",
  "dropped",
  "expired",
  "quarantined",
  "duplicate_paid",
  "cancelled",
] as const;

export type PaymentAttemptState = (typeof PAYMENT_ATTEMPT_STATES)[number];
export type PaymentPurpose = "initial_sponsorship" | "raise";

export type PaymentValidationErrorCode =
  | "PAYMENT_ATTEMPT_TRANSITION_NOT_ALLOWED"
  | "PAYMENT_AMOUNT_NOT_POSITIVE"
  | "PAYMENT_AMOUNT_NOT_WHOLE_RUPEE"
  | "PAYMENT_AMOUNT_BELOW_MINIMUM_SNAPSHOT"
  | "PAYMENT_MINIMUM_SNAPSHOT_NOT_POSITIVE"
  | "PAYMENT_MINIMUM_SNAPSHOT_NOT_WHOLE_RUPEE"
  | "PAYMENT_CURRENCY_UNSUPPORTED"
  | "PAYMENT_POLICY_VERSION_UNSUPPORTED"
  | "PAYMENT_PROVIDER_STATUS_UNKNOWN";

export type AttemptPolicySnapshot = Readonly<{
  purpose: PaymentPurpose;
  amountPaise: MoneyPaise;
  minimumRequiredPaise: MoneyPaise;
  currency: SupportedCurrency;
  policyVersion: PolicyVersion;
}>;

export type AttemptTransition = Readonly<{
  from: PaymentAttemptState;
  to: PaymentAttemptState;
  becameSucceeded: boolean;
  isIdempotentRepeat: boolean;
}>;

const attemptTransitions: Readonly<
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

export function canTransitionAttempt(
  from: PaymentAttemptState,
  to: PaymentAttemptState,
): boolean {
  return attemptTransitions[from].includes(to);
}

export function transitionAttempt(
  from: PaymentAttemptState,
  to: PaymentAttemptState,
): DomainResult<AttemptTransition, PaymentValidationErrorCode> {
  if (!canTransitionAttempt(from, to)) {
    return domainFailure("PAYMENT_ATTEMPT_TRANSITION_NOT_ALLOWED");
  }

  return domainSuccess({
    from,
    to,
    becameSucceeded: from !== "succeeded" && to === "succeeded",
    isIdempotentRepeat: from === "succeeded" && to === "succeeded",
  });
}

export function isSuccessfullyFulfilledAttempt(
  state: PaymentAttemptState,
): boolean {
  return state === "succeeded";
}

export function createAttemptPolicySnapshot(input: {
  purpose: PaymentPurpose;
  amountPaise: MoneyPaise;
  minimumRequiredPaise: MoneyPaise;
  currency: string;
  policyVersion: string;
}): DomainResult<AttemptPolicySnapshot, PaymentValidationErrorCode> {
  if (input.amountPaise <= 0n) {
    return domainFailure("PAYMENT_AMOUNT_NOT_POSITIVE");
  }

  if (!isWholeRupee(input.amountPaise)) {
    return domainFailure("PAYMENT_AMOUNT_NOT_WHOLE_RUPEE");
  }

  if (input.minimumRequiredPaise <= 0n) {
    return domainFailure("PAYMENT_MINIMUM_SNAPSHOT_NOT_POSITIVE");
  }

  if (!isWholeRupee(input.minimumRequiredPaise)) {
    return domainFailure("PAYMENT_MINIMUM_SNAPSHOT_NOT_WHOLE_RUPEE");
  }

  if (input.amountPaise < input.minimumRequiredPaise) {
    return domainFailure("PAYMENT_AMOUNT_BELOW_MINIMUM_SNAPSHOT");
  }

  if (input.currency !== CURRENCY) {
    return domainFailure("PAYMENT_CURRENCY_UNSUPPORTED");
  }

  if (input.policyVersion !== POLICY_VERSION) {
    return domainFailure("PAYMENT_POLICY_VERSION_UNSUPPORTED");
  }

  return domainSuccess({
    purpose: input.purpose,
    amountPaise: input.amountPaise,
    minimumRequiredPaise: input.minimumRequiredPaise,
    currency: CURRENCY,
    policyVersion: POLICY_VERSION,
  });
}

export const PROVIDER_PAYMENT_STATUSES = [
  "pending",
  "failed",
  "dropped",
  "expired",
  "succeeded",
] as const;

export type ProviderPaymentStatus = (typeof PROVIDER_PAYMENT_STATUSES)[number];

export type ProviderStatusMerge = Readonly<{
  status: ProviderPaymentStatus;
  changed: boolean;
  ignoredRegression: boolean;
  requiresReview: boolean;
}>;

export function mergeProviderPaymentStatus(
  current: ProviderPaymentStatus,
  observed: ProviderPaymentStatus,
): ProviderStatusMerge {
  if (current === observed) {
    return {
      status: current,
      changed: false,
      ignoredRegression: false,
      requiresReview: false,
    };
  }

  if (current === "succeeded") {
    return {
      status: current,
      changed: false,
      ignoredRegression: true,
      requiresReview: false,
    };
  }

  if (observed === "succeeded") {
    return {
      status: observed,
      changed: true,
      ignoredRegression: false,
      requiresReview: false,
    };
  }

  if (current === "pending") {
    return {
      status: observed,
      changed: true,
      ignoredRegression: false,
      requiresReview: false,
    };
  }

  if (observed === "pending") {
    return {
      status: current,
      changed: false,
      ignoredRegression: true,
      requiresReview: false,
    };
  }

  return {
    status: current,
    changed: false,
    ignoredRegression: false,
    requiresReview: true,
  };
}

export function normalizeProviderPaymentStatus(
  rawStatus: string,
  trustedMapping: Readonly<Record<string, ProviderPaymentStatus>>,
): DomainResult<ProviderPaymentStatus, PaymentValidationErrorCode> {
  const normalized = trustedMapping[rawStatus];

  return normalized
    ? domainSuccess(normalized)
    : domainFailure("PAYMENT_PROVIDER_STATUS_UNKNOWN");
}
