import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { RaisePoller } from "@/components/owner/raise-poller";
import { PaymentBrand } from "@/components/payment/payment-brand";
import { Money } from "@/components/public/money";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";

export const metadata: Metadata = { title: "Checking payment" };
export const instant = false;

export default async function RaisePendingPage({
  params,
}: {
  params: Promise<{ publicId: string; slug: string }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { publicId, slug } = await params;
  const attempt = await getOwnerRaiseAttemptStatus(publicId, slug, user.id);
  if (!attempt) notFound();
  if (attempt.state === "confirmed" || attempt.state === "reversed")
    redirect(`/manage/${slug}/raise/${publicId}/confirmed` as Route);
  return (
    <main className="pending-main" id="main-content">
      <section
        className={`pending-card${attempt.state === "failed" ? "failure-card" : ""}`}
        aria-labelledby="payment-status-title"
      >
        <PaymentBrand />
        <header className="payment-status-header">
          <span
            className={`pending-mark${attempt.state === "failed" ? "failed-mark" : ""}`}
            aria-hidden="true"
          >
            {attempt.state === "failed" ? "!" : "•••"}
          </span>
          <p className="eyebrow">
            {attempt.state === "failed"
              ? "Payment not completed"
              : "Payment being checked"}
          </p>
          <h1 id="payment-status-title">
            {attempt.state === "failed"
              ? "The extra payment didn’t go through."
              : "We’re checking your extra payment."}
          </h1>
          <p>
            {attempt.state === "failed"
              ? "Your listing total and position have not changed."
              : "Your listing total will change only after the payment is confirmed."}
          </p>
        </header>
        <dl className="payment-summary">
          <div>
            <dt>Listing</dt>
            <dd>{attempt.listingName}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              <Money paise={attempt.amountPaise} />
            </dd>
          </div>
        </dl>
        {attempt.state === "pending" ? <RaisePoller /> : null}
        <p className="payment-next-step">
          {attempt.state === "failed"
            ? "You can return to your listing and try again when ready."
            : "You can safely close this page. We’ll update your listing when confirmation arrives."}
        </p>
        <div className="payment-actions">
          <Link
            className="button button-secondary"
            href={`/manage/${slug}` as Route}
          >
            Back to your listing
          </Link>
        </div>
      </section>
    </main>
  );
}
