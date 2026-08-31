import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import type { Route } from "next";

import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";
import { PaymentBrand } from "@/components/payment/payment-brand";

export const instant = false;

export default async function RaiseMockCheckout({
  params,
}: {
  params: Promise<{ publicId: string; slug: string }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { publicId, slug } = await params;
  if (!(await getOwnerRaiseAttemptStatus(publicId, slug, user.id))) notFound();
  return (
    <main className="pending-main" id="main-content">
      <section className="pending-card">
        <PaymentBrand />
        <header className="payment-status-header">
          <span className="pending-mark" aria-hidden="true">
            TEST
          </span>
          <p className="eyebrow">Local payment test</p>
          <h1>Complete this test payment.</h1>
          <p>
            This page is only available during local testing. No real payment
            will be made.
          </p>
        </header>
        <form action="/api/mock/dodo/complete" method="post">
          <input name="publicId" type="hidden" value={publicId} />
          <button className="button button-primary" type="submit">
            Mark test payment complete
          </button>
        </form>
      </section>
    </main>
  );
}
