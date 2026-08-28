import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { RaisePoller } from "@/components/owner/raise-poller";
import { Money } from "@/components/public/money";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";

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
  if (attempt.state === "confirmed")
    redirect(`/manage/${slug}/raise/${publicId}/confirmed` as Route);
  return (
    <main className="pending-main" id="main-content">
      <section className="pending-card">
        <p className="eyebrow">
          {attempt.state === "failed" ? "Checkout closed" : "Raise pending"}
        </p>
        <h1>
          {attempt.state === "failed"
            ? "This raise was not confirmed."
            : "We’re checking your raise."}
        </h1>
        <p>
          <strong>{attempt.listingName}</strong> ·{" "}
          <Money paise={attempt.amountPaise} />
        </p>
        {attempt.state === "pending" ? <RaisePoller /> : null}
        <Link
          className="button button-secondary"
          href={`/manage/${slug}` as Route}
        >
          Back to listing
        </Link>
      </section>
    </main>
  );
}
