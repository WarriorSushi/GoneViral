import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { formatInr, moneyPaise } from "@/domain/money";
import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";

export const metadata: Metadata = { title: "Payment confirmed" };

export default async function ConfirmedPaymentPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  const attempt = await getPublicAttemptStatus(publicId);
  if (!attempt) notFound();
  if (attempt.state !== "confirmed") {
    redirect(`/join/${publicId}/pending` as Route);
  }

  return (
    <main id="main-content" className="pending-main">
      <div className="pending-card confirmed-card">
        <span className="confirmed-mark" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Payment confirmed</p>
        <h1>{attempt.listingName} is confirmed.</h1>
        <p>
          Dodo Payments confirmed your{" "}
          {formatInr(moneyPaise(attempt.amountPaise))} payment. The leaderboard
          has been updated from the payment ledger.
        </p>
        {attempt.mainRank ? (
          <p className="confirmed-rank">
            Your actual leaderboard position is{" "}
            <strong>#{attempt.mainRank}</strong>. Any position shown before
            checkout was only an estimate because the board can move while
            payment is pending.
          </p>
        ) : (
          <p className="confirmed-rank">
            The payment is recorded, but the listing is not public while its
            safety review is unresolved.
          </p>
        )}
        <p>
          We queued a confirmation and secure ownership-claim email. Delivery is
          a separate background step, so this page does not claim it has already
          arrived.
        </p>
        {attempt.listingPath ? (
          <Link
            className="button button-primary"
            href={attempt.listingPath as Route}
          >
            View your listing
          </Link>
        ) : null}
        <Link className="button button-secondary" href="/">
          See the leaderboard
        </Link>
      </div>
    </main>
  );
}
