import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { Money } from "@/components/public/money";
import { PaymentBrand } from "@/components/payment/payment-brand";
import { ShareControls } from "@/components/public/share-controls";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";

export const metadata: Metadata = { title: "Payment status" };
export const instant = false;

export default async function RaiseConfirmedPage({
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
  if (attempt.state !== "confirmed" && attempt.state !== "reversed")
    redirect(`/manage/${slug}/raise/${publicId}/pending` as Route);
  const reversed = attempt.state === "reversed";
  return (
    <main className="pending-main" id="main-content">
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
              ? "This extra payment was returned."
              : "Your listing total has been updated."}
          </h1>
          <p>
            {reversed
              ? "It no longer counts toward your listing total or position."
              : "We received your extra payment and added it to the listing."}
          </p>
        </header>
        <dl className="payment-summary">
          <div>
            <dt>Listing</dt>
            <dd>{attempt.listingName}</dd>
          </div>
          <div>
            <dt>{reversed ? "Returned" : "Added"}</dt>
            <dd>
              <Money paise={attempt.amountPaise} />
            </dd>
          </div>
        </dl>
        <div className="confirmed-rank">
          <p>{reversed ? "Listing status" : "Your current position"}</p>
          <strong>
            {attempt.mainRank
              ? `#${attempt.mainRank}`
              : reversed
                ? "Not on the leaderboard"
                : "Under review"}
          </strong>
          <p>
            {reversed && attempt.mainRank
              ? "Other confirmed payments still count. This returned payment does not."
              : reversed
                ? "No confirmed total remains from this listing’s payments. Its history is still kept."
                : attempt.mainRank
                  ? `The checkout estimate${attempt.estimatedRank ? ` was #${attempt.estimatedRank}` : ""}. Rankings can change, so that spot was not reserved.`
                  : "Your payment is recorded. The listing will appear after its safety review is complete."}
          </p>
        </div>
        {!reversed && attempt.mainRank ? (
          <ShareControls
            currentRank={attempt.mainRank.toString()}
            listingName={attempt.listingName}
            listingPath={`/l/${slug}`}
          />
        ) : null}
        <div className="payment-actions">
          <Link
            className="button button-primary"
            href={`/manage/${slug}` as Route}
          >
            Open listing
          </Link>
        </div>
      </section>
    </main>
  );
}
