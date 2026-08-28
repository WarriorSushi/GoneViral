import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { refreshPublicBoard } from "@/app/actions/refresh-public-board";
import { Money } from "@/components/public/money";
import { SponsoredDisclosure } from "@/components/public/sponsored-disclosure";
import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";
import type { PublicMovementKind } from "@/server/db/repositories/public-types";

export const metadata: Metadata = { title: "Sponsored listing" };

const movementLabels: Record<PublicMovementKind, string> = {
  added: "Added confirmed sponsorship",
  adjusted: "Confirmed total adjusted",
  joined: "Joined the board",
  restored: "Confirmed sponsorship restored",
};

export default async function ListingPage(props: PageProps<"/l/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const businessDate = toIstBusinessDate(new Date());
  const listing = await getCachedPublicListingDetail(slug, businessDate);

  if (!listing) {
    notFound();
  }

  return (
    <main id="main-content" className="public-main listing-page">
      <SponsoredDisclosure />
      <section className="listing-hero">
        <div className="listing-mark listing-mark-large" aria-hidden="true">
          {listing.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="listing-heading">
          <p className="eyebrow">
            SPONSORED PLACEMENT · {listing.category.name}
          </p>
          <h1>{listing.name}</h1>
          <p>{listing.tagline}</p>
          <span className="destination-label">
            {new URL(listing.destinationUrl).host}
          </span>
        </div>
        <div className="listing-rank-block">
          <span className="rank">#{listing.currentMainRank}</span>
          <Money paise={listing.confirmedTotalPaise} />
          <small>confirmed cumulative</small>
        </div>
      </section>

      <section
        className="listing-signal-grid"
        aria-label="Current listing signal"
      >
        <article>
          <p className="eyebrow">MAIN</p>
          <strong>#{listing.currentMainRank}</strong>
          <span>Current sponsored rank</span>
        </article>
        <article>
          <p className="eyebrow">TODAY</p>
          {listing.todayRank && listing.todayNetPaise ? (
            <>
              <strong>#{listing.todayRank}</strong>
              <span>
                <Money paise={listing.todayNetPaise} /> net today
              </span>
            </>
          ) : (
            <>
              <strong>—</strong>
              <span>No positive net sponsorship today</span>
            </>
          )}
        </article>
        <article className="listing-quote">
          <p className="eyebrow">CURRENT ESTIMATE</p>
          <strong>
            <Money paise={listing.takeoverQuote.requiredPaymentPaise} />
          </strong>
          <span>currently passes #{listing.currentMainRank}</span>
          <Link
            className="button button-primary"
            href="/how-it-works#sponsoring"
          >
            Take #{listing.currentMainRank}
          </Link>
        </article>
      </section>

      <p className="estimate-note listing-estimate-note">
        This quote was calculated at{" "}
        <time dateTime={listing.takeoverQuote.estimatedAt}>
          {new Date(listing.takeoverQuote.estimatedAt).toLocaleTimeString(
            "en-IN",
            { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" },
          )}{" "}
          IST
        </time>
        . It is not a reservation or guarantee. Checkout is not enabled yet.
      </p>

      <section className="movement-section" aria-labelledby="movement-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">PUBLIC-SAFE HISTORY</p>
            <h2 id="movement-title">Confirmed movement</h2>
          </div>
          <form action={refreshPublicBoard}>
            <input type="hidden" name="kind" value="listing" />
            <input type="hidden" name="slug" value={slug} />
            <button className="refresh-button" type="submit">
              Refresh listing
            </button>
          </form>
        </div>
        {listing.movements.length > 0 ? (
          <ol className="movement-list">
            {listing.movements.map((movement) => (
              <li key={`${movement.appliedAt}-${movement.kind}`}>
                <span>{movementLabels[movement.kind]}</span>
                <Money paise={movement.amountDeltaPaise} />
                <time dateTime={movement.appliedAt}>
                  {new Date(movement.appliedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="quiet-empty">
            No public movement records are available.
          </p>
        )}
      </section>

      <aside className="listing-safety-note">
        <strong>Destination visits are not enabled yet.</strong>
        <p>
          The approved host is shown above. A safety-checked outbound redirect
          and reporting flow will be added before public launch.
        </p>
      </aside>
    </main>
  );
}
