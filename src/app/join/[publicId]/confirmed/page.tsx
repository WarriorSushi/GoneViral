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
    <main id="main-content" className="pending-main celebration-main">
      <section
        className={`pending-card confirmed-card celebration-card ${reversed ? "returned-card" : "success-card"}`}
        aria-labelledby="payment-status-title"
      >
        <div className="celebration-brand-row">
          <PaymentBrand />
          <span className="celebration-receipt">
            <span aria-hidden="true" />
            {reversed ? "Payment returned" : "Payment confirmed"}
          </span>
        </div>
        <div className="celebration-hero">
          <header className="payment-status-header">
            <span
              className={
                reversed ? "pending-mark returned-mark" : "confirmed-mark"
              }
              aria-hidden="true"
            >
              {reversed ? (
                <svg viewBox="0 0 24 24">
                  <path d="M9 7 4 12l5 5M5 12h9a5 5 0 1 1 0 10h-2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}
            </span>
            <h1 id="payment-status-title">
              {reversed
                ? "This payment was returned."
                : "You’re on the leaderboard."}
            </h1>
            <p>
              {reversed
                ? "This payment no longer counts toward the listing’s leaderboard total."
                : "Your placement is live. Now turn that position into attention."}
            </p>
          </header>
          {reversed ? (
            <div className="confirmed-rank">
              <p>{attempt.mainRank ? "Still live" : "Listing status"}</p>
              <strong>
                {attempt.mainRank ? `#${attempt.mainRank}` : "Not ranked"}
              </strong>
              <p>
                {attempt.mainRank
                  ? "Other confirmed payments keep this listing on the leaderboard."
                  : "Its payment history is safely preserved."}
              </p>
            </div>
          ) : attempt.mainRank ? (
            <div className="confirmed-rank">
              <p>Current position</p>
              <strong>
                <span aria-hidden="true">#</span>
                {attempt.mainRank}
              </strong>
              <p>
                Live now. Your checkout rank was an estimate, not a reserved
                spot.
              </p>
            </div>
          ) : (
            <div className="confirmed-rank">
              <p>Payment received</p>
              <strong>Under review</strong>
              <p>Your listing will appear after its safety review.</p>
            </div>
          )}
        </div>
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
        <div className="payment-next-step">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 6h16v12H4z" />
            <path d="m5 7 7 6 7-6" />
          </svg>
          <p>
            {reversed
              ? "If you did not expect this, contact support and include the payment reference from your original checkout."
              : "We’re sending an email with your secure management link. It may take a few minutes to arrive."}
          </p>
        </div>
        {!reversed && attempt.listingPath ? (
          <>
            {attempt.mainRank ? (
              <ShareControls
                currentRank={attempt.mainRank.toString()}
                listingName={attempt.listingName}
                listingPath={attempt.listingPath}
                showPreview
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
