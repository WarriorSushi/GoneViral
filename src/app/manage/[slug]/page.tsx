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
  initial_sponsorship: "Initial payment",
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
            Original payment: <Money paise={listing.originalSponsorshipPaise} />
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

      {listing.lifecycleStatus !== "removed" &&
      listing.moderationStatus !== "suspended" ? (
        <Link
          className="button button-primary owner-raise-link"
          href={`/manage/${slug}/raise` as Route}
        >
          Raise this listing
        </Link>
      ) : null}

      {listing.lifecycleStatus !== "removed" ? (
        <Link
          className="button button-secondary owner-edit-link"
          href={`/manage/${slug}/edit` as Route}
        >
          Edit listing
        </Link>
      ) : null}

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
          <table className="owner-history-table">
            <caption className="visually-hidden">
              Confirmed payment and adjustment history
            </caption>
            <thead className="visually-hidden">
              <tr>
                <th scope="col">Entry and date</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <tr
                  className="owner-history-row"
                  key={`${item.appliedAt}-${item.entryType}-${index}`}
                >
                  <td>
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
                  </td>
                  <td>
                    <Money paise={item.amountDeltaPaise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <aside className="owner-trust-links" aria-label="Support and policies">
        <strong>Need help with a payment or listing?</strong>
        <p>
          Review the <Link href="/terms">terms draft</Link>,{" "}
          <Link href="/privacy">privacy draft</Link>,{" "}
          <Link href="/refunds">refund draft</Link>, or use the{" "}
          <Link href="/contact">contact / abuse hook</Link>.
        </p>
      </aside>
    </main>
  );
}
