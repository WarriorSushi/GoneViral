"use server";

import { headers } from "next/headers";

import { readPublicEnv } from "@/config/env/public";
import { validateReportForm } from "@/domain/report";
import { submitPublicReport } from "@/server/reports/submit-report";
import { getTurnstileVerifier } from "@/server/security/turnstile";

export type ReportActionState = Readonly<{
  complete?: boolean;
  message?: string;
}>;

export async function submitReportAction(
  slug: string,
  _previous: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!formData.get("turnstileToken")) {
    formData.set("turnstileToken", formData.get("cf-turnstile-response") ?? "");
  }
  const parsed = validateReportForm(formData);
  if (!parsed.success)
    return { message: "Check the reason, details, and security check." };
  const requestHeaders = await headers();
  const remoteIp =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const siteUrl = readPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const result = await submitPublicReport({
    listingSlug: slug,
    remoteIp,
    report: parsed.data,
    turnstile: getTurnstileVerifier(siteUrl),
    userAgent: requestHeaders.get("user-agent") ?? "unknown",
  });
  if (result.kind === "rejected")
    return { message: "The security check failed. Please try again." };
  if (result.kind === "unavailable")
    return { message: "Reports are temporarily read-only. Please try later." };
  return {
    complete: true,
    message:
      "Thanks. We received your report. We do not reveal whether another report already exists.",
  };
}
