"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";

import { PUBLIC_CACHE_TAGS } from "@/server/cache/tags";
import { getAdminSession } from "@/server/admin/auth";
import {
  enqueueSafeManagementEmail,
  moderateListing,
  resolveReport,
  reviewChangeRequest,
  updateOperationalFlag,
  type AdminOperationResult,
  type AdminRequestContext,
} from "@/server/admin/operations";
import {
  confirmProviderRefund,
  prepareProviderRefund,
} from "@/server/admin/refunds";
import { submissionDigest } from "@/server/security/submission-security";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireContext(
  formData: FormData,
): Promise<AdminRequestContext> {
  const session = await getAdminSession({ requireRecent: true });
  if (session.kind !== "authenticated") throw new Error(session.kind);
  const requestHeaders = await headers();
  const forwarded =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  return {
    ipHmac: submissionDigest(forwarded),
    requestId: text(formData, "requestId"),
    session: session.session,
    userAgentSummary: requestHeaders.get("user-agent") ?? "unknown",
  };
}

function refresh(result: AdminOperationResult) {
  revalidatePath("/admin");
  revalidateTag(PUBLIC_CACHE_TAGS.main, { expire: 0 });
  revalidateTag(PUBLIC_CACHE_TAGS.activity, { expire: 0 });
  for (const publicId of result.listingPublicIds ?? []) {
    revalidateTag(PUBLIC_CACHE_TAGS.listing(publicId), { expire: 0 });
  }
  if (result.kind === "rejected")
    throw new Error(result.message ?? "admin_operation_rejected");
}

export async function moderateAdminAction(formData: FormData) {
  const action = text(formData, "action");
  if (!new Set(["clear", "remove", "suspend", "unsuspend"]).has(action))
    throw new Error("admin_action_invalid");
  const publicReason = text(formData, "publicReason");
  const result = await moderateListing({
    action: action as "clear" | "remove" | "suspend" | "unsuspend",
    context: await requireContext(formData),
    listingPublicId: text(formData, "listingPublicId"),
    ...(publicReason ? { publicReason } : {}),
    reason: text(formData, "reason"),
  });
  refresh(result);
}

export async function resolveReportAdminAction(formData: FormData) {
  const resolution = text(formData, "resolution");
  if (!new Set(["dismissed", "resolved"]).has(resolution))
    throw new Error("report_resolution_invalid");
  const result = await resolveReport({
    context: await requireContext(formData),
    reason: text(formData, "reason"),
    reportPublicId: text(formData, "reportPublicId"),
    resolution: resolution as "dismissed" | "resolved",
  });
  refresh(result);
}

export async function reviewChangeAdminAction(formData: FormData) {
  const decision = text(formData, "decision");
  if (!new Set(["approved", "rejected"]).has(decision))
    throw new Error("change_decision_invalid");
  const result = await reviewChangeRequest({
    allowReassignment: text(formData, "allowReassignment") === "yes",
    changeRequestId: text(formData, "changeRequestId"),
    context: await requireContext(formData),
    decision: decision as "approved" | "rejected",
    reason: text(formData, "reason"),
  });
  refresh(result);
}

export async function updateFlagAdminAction(formData: FormData) {
  const key = text(formData, "key");
  if (
    !new Set([
      "outbound_redirects_enabled",
      "payments_enabled",
      "provider_refunds_enabled",
      "read_only",
    ]).has(key)
  )
    throw new Error("operational_flag_invalid");
  const result = await updateOperationalFlag({
    context: await requireContext(formData),
    enabled: text(formData, "enabled") === "true",
    key: key as
      | "outbound_redirects_enabled"
      | "payments_enabled"
      | "provider_refunds_enabled"
      | "read_only",
    reason: text(formData, "reason"),
  });
  refresh(result);
}

export async function resendManagementAdminAction(formData: FormData) {
  const result = await enqueueSafeManagementEmail({
    context: await requireContext(formData),
    listingPublicId: text(formData, "listingPublicId"),
    reason: text(formData, "reason"),
  });
  refresh(result);
}

export async function prepareRefundAdminAction(formData: FormData) {
  const amount = text(formData, "amountPaise");
  if (!/^[1-9][0-9]*$/.test(amount)) throw new Error("refund_amount_invalid");
  const result = await prepareProviderRefund({
    amountPaise: BigInt(amount),
    context: await requireContext(formData),
    providerPaymentId: text(formData, "providerPaymentId"),
    reason: text(formData, "reason"),
  });
  refresh(result);
}

export async function confirmRefundAdminAction(formData: FormData) {
  const result = await confirmProviderRefund({
    context: await requireContext(formData),
    reason: text(formData, "reason"),
    refundPublicId: text(formData, "refundPublicId"),
  });
  refresh(result);
}
