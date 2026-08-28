"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { readPublicEnv } from "@/config/env/public";
import { validateRaiseForm, type RaiseField } from "@/domain/raise";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { getPaymentProvider } from "@/server/payments";
import { createRaiseCheckout } from "@/server/payments/create-raise-checkout";

export type RaiseActionState = Readonly<{
  errors?: Partial<Record<RaiseField, string>>;
  message?: string;
}>;

export async function submitRaise(
  slug: string,
  _state: RaiseActionState,
  formData: FormData,
): Promise<RaiseActionState> {
  const user = await getVerifiedAuthUser();
  if (!user) return { message: "Your secure session expired. Sign in again." };
  const validated = validateRaiseForm(formData);
  if (!validated.ok) return { errors: validated.errors };
  const siteUrl = readPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const result = await createRaiseCheckout({
    email: user.email,
    form: validated.value,
    listingSlug: slug,
    provider: getPaymentProvider(siteUrl),
    siteUrl,
    userId: user.id,
  });
  if (result.kind === "checkout") redirect(result.checkoutUrl as Route);
  if (result.kind === "pending") {
    redirect(`/manage/${slug}/raise/${result.publicId}/pending` as Route);
  }
  return { message: result.message };
}
