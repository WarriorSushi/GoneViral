import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { formatInr, moneyPaise } from "@/domain/money";
import { PaymentBrand } from "@/components/payment/payment-brand";
import { ShareControls } from "@/components/public/share-controls";
import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";

export const metadata: Metadata = { title: "Payment status" };
export const instant = false;

export default async function ConfirmedPaymentPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  const attempt = await getPublicAttemptStatus(publicId);
  if (!attempt) notFound();
  if (attempt.state !== "confirmed" && attempt.state !== "reversed") {
    redirect(`/join/${publicId}/pending` as Route);
  }

  const reversed = attempt.state === "reversed";

  return (
    <main id="main-content" className="pending-main">
      <section
        className={`pending-card confirmed-card ${reversed ? "returned-card" : "success-card"}`}
        aria-labelledby="payment-status-title"
      >
        <PaymentBrand />
        <header className="payment-status-header">
          <span
            className={
              reversed ? "pending-mark returned-mark" : "confirmed-mark"
            }
            aria-hidden="true"
          >
            {reversed ? "↩︎" : "✓"}
          </span>
          <p className="eyebrow">
            {reversed ? "Payment returned" : "Payment complete"}
          </p>
          <h1 id="payment-status-title">
            {reversed
              ? "This payment was returned."
              : "You’re on the leaderboard."}
          </h1>
          <p>
            {reversed
              ? "This payment no longer counts toward the listing’s leaderboard total."
              : "We received your payment and added it to your listing’s total."}
          </p>
        </header>
        <dl className="payment-summary">
          <div>
            <dt>Listing</dt>
            <dd>{attempt.listingName}</dd>
          </div>
          <div>
            <dt>{reversed ? "Returned" : "Paid"}</dt>
            <dd>{formatInr(moneyPaise(attempt.amountPaise))}</dd>
          </div>
        </dl>
        {reversed ? (
          <div className="confirmed-rank">
            <p>
              {attempt.mainRank ? "Listing still live" : "Listing not live"}
            </p>
            <strong>
              {attempt.mainRank ? `#${attempt.mainRank}` : "₹0 total"}
            </strong>
            <p>
              {attempt.mainRank
                ? "Other confirmed payments still count, so the listing remains on the leaderboard."
                : "The listing is no longer on the leaderboard. Its payment history is still kept."}
            </p>
          </div>
        ) : attempt.mainRank ? (
          <div className="confirmed-rank">
            <p>Your current position</p>
            <strong>#{attempt.mainRank}</strong>
            <p>
              Ranks can change when other listings pay. The position shown at
              checkout was an estimate, not a reserved spot.
            </p>
          </div>
        ) : (
          <div className="confirmed-rank">
            <p>Payment received</p>
            <strong>Under review</strong>
            <p>Your listing will appear after its safety review is complete.</p>
          </div>
        )}
        <p className="payment-next-step">
          {reversed
            ? "If you did not expect this, contact support and include the payment reference from your original checkout."
            : "We’re sending an email with your secure link to manage this listing. It may take a few minutes to arrive."}
        </p>
        {!reversed && attempt.listingPath ? (
          <>
            {attempt.mainRank ? (
              <ShareControls
                currentRank={attempt.mainRank.toString()}
                listingName={attempt.listingName}
                listingPath={attempt.listingPath}
              />
            ) : null}
          </>
        ) : null}
        <div className="payment-actions">
          {attempt.listingPath ? (
            <Link
              className="button button-primary"
              href={attempt.listingPath as Route}
            >
              Open listing
            </Link>
          ) : null}
          <Link className="button button-secondary" href="/">
            Leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
