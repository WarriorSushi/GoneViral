import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { formatInr, moneyPaise } from "@/domain/money";
import { PendingPaymentPoller } from "@/components/join/pending-payment-poller";
import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";

export const metadata: Metadata = { title: "Checking payment" };
export default async function PendingPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  const attempt = await getPublicAttemptStatus(publicId);
  if (!attempt) notFound();
  if (attempt.state === "confirmed") {
    redirect(`/join/${publicId}/confirmed` as Route);
  }

  return (
    <main id="main-content" className="pending-main">
      <div className="pending-card">
        <span className="pending-mark" aria-hidden="true">
          •••
        </span>
        <p className="eyebrow">
          {attempt.state === "failed" ? "Checkout closed" : "Payment pending"}
        </p>
        <h1>
          {attempt.state === "failed"
            ? "We could not verify this checkout."
            : "We’re checking your payment."}
        </h1>
        <p>
          <strong>{attempt.listingName}</strong> ·{" "}
          {formatInr(moneyPaise(attempt.amountPaise))}
        </p>
        <p className="support-reference">Support reference: {publicId}</p>
        {attempt.state === "pending" ? (
          <PendingPaymentPoller publicId={publicId} />
        ) : null}
        <p>
          {attempt.state === "failed"
            ? "No listing has been activated. You can start a new submission when ready."
            : "Your listing is not live yet. Verification can take a little time; you may safely close this page."}
        </p>
        <Link className="button button-secondary" href="/">
          Back to the leaderboard
        </Link>
      </div>
    </main>
  );
}
