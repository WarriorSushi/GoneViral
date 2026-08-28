import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { getVerifiedAuthUser } from "@/server/auth/session";
import { recordOwnerRaiseReturn } from "@/server/db/repositories/private/owners";

export default async function RaiseReturnPage({
  params,
}: {
  params: Promise<{ publicId: string; slug: string }>;
}) {
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { publicId, slug } = await params;
  if (!(await recordOwnerRaiseReturn(publicId, slug, user.id))) notFound();
  redirect(`/manage/${slug}/raise/${publicId}/pending` as Route);
}
