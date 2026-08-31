import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { formatInr, moneyPaise } from "@/domain/money";
import { PendingPaymentPoller } from "@/components/join/pending-payment-poller";
import { PaymentBrand } from "@/components/payment/payment-brand";
import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";

export const metadata: Metadata = { title: "Checking payment" };
export const instant = false;

export default async function PendingPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  const attempt = await getPublicAttemptStatus(publicId);
  if (!attempt) notFound();
  if (attempt.state === "confirmed" || attempt.state === "reversed") {
    redirect(`/join/${publicId}/confirmed` as Route);
  }

  return (
    <main id="main-content" className="pending-main">
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
              ? "Your payment didn’t go through."
              : "We’re still checking your payment."}
          </h1>
          <p>
            {attempt.state === "failed"
              ? "GoneViral has not confirmed this payment, so your listing was not activated."
              : "Your listing will stay hidden until the payment is confirmed."}
          </p>
        </header>
        <dl className="payment-summary">
          <div>
            <dt>Listing</dt>
            <dd>{attempt.listingName}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatInr(moneyPaise(attempt.amountPaise))}</dd>
          </div>
        </dl>
        <p className="support-reference">
          <span>Need help? Keep this reference:</span> <code>{publicId}</code>
        </p>
        {attempt.state === "pending" ? (
          <PendingPaymentPoller publicId={publicId} />
        ) : null}
        <p className="payment-next-step">
          {attempt.state === "failed"
            ? "You can try again with a new submission. If your bank shows a debit, contact support and include the reference above."
            : "Do not pay again while this check is in progress. You can safely close this page; we’ll update the listing as soon as confirmation arrives."}
        </p>
        <div className="payment-actions">
          <Link className="button button-secondary" href="/">
            Back to the leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
