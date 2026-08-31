"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { readPublicEnv } from "@/config/env/public";
import { validateJoinForm, type JoinField } from "@/domain/join";
import { createGuestCheckout } from "@/server/payments/create-guest-checkout";
import { getPaymentProvider } from "@/server/payments";
import { getTurnstileVerifier } from "@/server/security/turnstile";
import {
  LOGO_INPUT_TYPES,
  LOGO_MAX_INPUT_BYTES,
} from "@/server/storage/logo-policy";

export type JoinActionState = Readonly<{
  errors?: Partial<Record<JoinField, string>>;
  message?: string;
}>;

export async function submitJoinForm(
  _previous: JoinActionState,
  formData: FormData,
): Promise<JoinActionState> {
  if (!formData.get("turnstileToken")) {
    formData.set("turnstileToken", formData.get("cf-turnstile-response") ?? "");
  }
  const validated = validateJoinForm(formData);
  if (!validated.ok) return { errors: validated.errors };

  const logoFile = formData.get("logo");
  const hasLogo = logoFile instanceof File && logoFile.size > 0;
  if (
    hasLogo &&
    (!LOGO_INPUT_TYPES.has(logoFile.type) ||
      logoFile.size > LOGO_MAX_INPUT_BYTES)
  ) {
    return {
      errors: { logo: "Choose a JPEG, PNG or WebP image up to 2 MB." },
    };
  }
  const logo = hasLogo
    ? {
        bytes: Buffer.from(await logoFile.arrayBuffer()),
        contentType: logoFile.type,
      }
    : undefined;

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const remoteIp = forwardedFor || requestHeaders.get("x-real-ip") || "local";
  const siteUrl = readPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const result = await createGuestCheckout({
    form: validated.value,
    ...(logo ? { logo } : {}),
    provider: getPaymentProvider(siteUrl),
    remoteIp,
    siteUrl,
    turnstile: getTurnstileVerifier(siteUrl),
  });

  if (result.kind === "checkout") redirect(result.checkoutUrl as Route);
  if (result.kind === "pending")
    redirect(`/join/${result.publicId}/pending` as Route);
  if (result.kind === "duplicate") {
    return {
      message: result.publicListingPath
        ? `That website already has a listing. View it at ${result.publicListingPath}`
        : "That website has already been submitted. Check the email used for the original submission.",
    };
  }
  return { message: result.message };
}
