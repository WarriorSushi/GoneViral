import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { recordCustomerReturn } from "@/server/db/repositories/private/guest-checkout";

export default async function PaymentReturnPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  if (!(await recordCustomerReturn(publicId))) notFound();
  redirect(`/join/${publicId}/pending` as Route);
}
