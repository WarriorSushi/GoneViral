import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { Money } from "@/components/public/money";
import { ShareControls } from "@/components/public/share-controls";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";

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
  if (attempt.state !== "confirmed")
    redirect(`/manage/${slug}/raise/${publicId}/pending` as Route);
  return (
    <main className="pending-main" id="main-content">
      <section className="pending-card confirmed-card">
        <span className="confirmed-mark" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Raise confirmed</p>
        <h1>
          <Money paise={attempt.amountPaise} /> was added.
        </h1>
        <p>
          Dodo Payments confirmed the raise and the immutable ledger updated the
          listing total.
        </p>
        <p className="confirmed-rank">
          Actual Main position:{" "}
          <strong>
            {attempt.mainRank ? `#${attempt.mainRank}` : "not public"}
          </strong>
          . The checkout estimate
          {attempt.estimatedRank
            ? ` was #${attempt.estimatedRank}`
            : " was informational"}
          ; no position was reserved.
        </p>
        {attempt.mainRank ? (
          <ShareControls
            currentRank={attempt.mainRank.toString()}
            listingName={attempt.listingName}
            listingPath={`/l/${slug}`}
          />
        ) : null}
        <Link
          className="button button-primary"
          href={`/manage/${slug}` as Route}
        >
          View updated listing
        </Link>
      </section>
    </main>
  );
}
