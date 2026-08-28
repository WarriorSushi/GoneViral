import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";

import { Money } from "@/components/public/money";
import { getVerifiedAuthUser } from "@/server/auth/session";
import {
  listOwnerPaymentHistory,
  requireOwnerListingBySlug,
} from "@/server/db/repositories/private/owners";

import { signOutOwner } from "../actions";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Listing overview",
};

type OwnerListingPageProps = { params: Promise<{ slug: string }> };

const paymentLabels: Record<string, string> = {
  chargeback: "Chargeback",
  chargeback_restoration: "Chargeback restored",
  initial_sponsorship: "Initial sponsorship",
  raise: "Raise",
  refund: "Refund",
  refund_restoration: "Refund restored",
};

export default async function OwnerListingPage({
  params,
}: OwnerListingPageProps) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);

  const { slug } = await params;
  const [listing, history] = await Promise.all([
    requireOwnerListingBySlug(slug, user.id),
    listOwnerPaymentHistory(slug, user.id),
  ]);
  if (!listing) notFound();

  return (
    <main className="manage-main" id="main-content">
      <div className="manage-heading">
        <div>
          <Link className="owner-back-link" href={"/manage" as Route}>
            ← All listings
          </Link>
          <p className="eyebrow">Private listing overview</p>
          <h1>{listing.name}</h1>
          <p>{listing.tagline}</p>
        </div>
        <form action={signOutOwner}>
          <input name="next" type="hidden" value="/manage" />
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <section className="owner-overview-grid" aria-label="Listing status">
        <div>
          <span>Status</span>
          <strong>{listing.lifecycleStatus.replaceAll("_", " ")}</strong>
          <small>
            Moderation: {listing.moderationStatus.replaceAll("_", " ")}
          </small>
        </div>
        <div>
          <span>Main rank</span>
          <strong>{listing.rank ? `#${listing.rank}` : "Not ranked"}</strong>
        </div>
        <div>
          <span>Confirmed total</span>
          <strong>
            <Money paise={listing.confirmedTotalPaise} />
          </strong>
          <small>
            Original: <Money paise={listing.originalSponsorshipPaise} />
          </small>
        </div>
        <div>
          <span>Today (IST)</span>
          <strong>
            <Money paise={listing.todayTotalPaise} />
          </strong>
        </div>
      </section>

      <section className="owner-destination">
        <div>
          <p className="eyebrow">Destination</p>
          <h2>{listing.destinationHost}</h2>
        </div>
        <a
          href={listing.destinationUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open website ↗
        </a>
      </section>

      <section
        className="owner-history"
        aria-labelledby="payment-history-title"
      >
        <div>
          <p className="eyebrow">Private financial record</p>
          <h2 id="payment-history-title">Payment history</h2>
        </div>
        {history.length === 0 ? (
          <p>No confirmed entries yet.</p>
        ) : (
          <div
            className="owner-history-table"
            role="table"
            aria-label="Payment history"
          >
            {history.map((item, index) => (
              <div
                className="owner-history-row"
                key={`${item.appliedAt}-${item.entryType}-${index}`}
                role="row"
              >
                <div role="cell">
                  <strong>
                    {paymentLabels[item.entryType] ?? "Financial adjustment"}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    }).format(new Date(item.appliedAt))}
                  </span>
                </div>
                <div role="cell">
                  <Money paise={item.amountDeltaPaise} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="owner-phase-note">
        Raising placement and editing listing details are intentionally not part
        of this phase.
      </p>
    </main>
  );
}
