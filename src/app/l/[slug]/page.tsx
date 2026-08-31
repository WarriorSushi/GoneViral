import type { Metadata, Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { refreshPublicBoard } from "@/app/actions/refresh-public-board";
import { BackArrowIcon } from "@/components/icons/back-arrow-icon";
import { Money } from "@/components/public/money";
import { ShareControls } from "@/components/public/share-controls";
import { SponsoredDisclosure } from "@/components/public/sponsored-disclosure";
import { canonicalUrl } from "@/config/seo";
import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";
import type { PublicMovementKind } from "@/server/db/repositories/public-types";

export async function generateMetadata(
  props: PageProps<"/l/[slug]">,
): Promise<Metadata> {
  await connection();
  const { slug } = await props.params;
  const listing = await getCachedPublicListingDetail(
    slug,
    toIstBusinessDate(new Date()),
  );
  if (!listing)
    return { robots: { index: false }, title: "Listing unavailable" };
  const description = `${listing.name} is currently #${listing.currentMainRank} on the paid GoneViral.in leaderboard. Order is based on confirmed totals.`;
  const url = canonicalUrl(`/l/${listing.slug}`);
  return {
    alternates: { canonical: url },
    description,
    openGraph: {
      description,
      locale: "en_IN",
      siteName: "GoneViral.in",
      title: `${listing.name} is #${listing.currentMainRank}`,
      type: "website",
      url,
    },
    title: `${listing.name} · #${listing.currentMainRank}`,
    twitter: {
      card: "summary_large_image",
      description,
      title: `${listing.name} is #${listing.currentMainRank}`,
    },
  };
}

const movementLabels: Record<PublicMovementKind, string> = {
  added: "Money added",
  adjusted: "Total changed",
  joined: "Joined the list",
  restored: "Money restored",
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
      <nav className="listing-page-nav" aria-label="Listing navigation">
        <Link className="button button-secondary back-link" href="/">
          <BackArrowIcon />
          <span>Back to home</span>
        </Link>
      </nav>
      <SponsoredDisclosure />
      <section className="listing-hero">
        {listing.logoUrl ? (
          <Image
            alt={`${listing.name} logo`}
            className="listing-mark listing-mark-large listing-logo"
            height={96}
            preload
            sizes="96px"
            src={listing.logoUrl}
            width={96}
          />
        ) : (
          <div className="listing-mark listing-mark-large" aria-hidden="true">
            {listing.name.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="listing-heading">
          <p className="listing-category">{listing.category.name}</p>
          <h1>{listing.name}</h1>
          <p>{listing.tagline}</p>
          <span className="destination-label">
            {new URL(listing.destinationUrl).host}
          </span>
          <a
            aria-label={`Visit ${listing.name} website`}
            className="button button-secondary listing-visit"
            href={`/go/${listing.slug}`}
            rel="nofollow noopener"
          >
            Visit website →
          </a>
        </div>
        <div className="listing-rank-block">
          <span className="rank">#{listing.currentMainRank}</span>
          <Money paise={listing.confirmedTotalPaise} />
          <small>current total</small>
        </div>
      </section>

      <section
        className="listing-signal-grid"
        aria-label="Current listing details"
      >
        <article>
          <p className="signal-label">All time</p>
          <strong>#{listing.currentMainRank}</strong>
          <span>Current spot</span>
        </article>
        <article>
          <p className="signal-label">Today</p>
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
              <span>No move today</span>
            </>
          )}
        </article>
        <article className="listing-quote">
          <p className="signal-label">Move up</p>
          <strong>
            <Money paise={listing.takeoverQuote.requiredPaymentPaise} />
          </strong>
          <span>to pass #{listing.currentMainRank}</span>
          <Link className="button button-primary" href="/how-it-works#join">
            Take #{listing.currentMainRank}
          </Link>
        </article>
        <article>
          <p className="signal-label">Outbound engagement</p>
          <strong>{listing.uniqueClicks}</strong>
          <span>privacy-preserving tracked clicks</span>
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
        . This is an estimate. The spot is not held. Checkout uses Dodo
        Payments.
      </p>

      <section className="movement-section" aria-labelledby="movement-title">
        <div className="section-title-row">
          <div>
            <h2 id="movement-title">Payment history</h2>
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
          <p className="quiet-empty">No payment history yet.</p>
        )}
      </section>

      <ShareControls
        currentRank={listing.currentMainRank}
        listingName={listing.name}
        listingPath={`/l/${listing.slug}`}
      />

      <aside className="listing-safety-note">
        <strong>Safe outbound link</strong>
        <p>
          The stored destination is rechecked before redirecting. Tracked clicks
          are deduplicated and never affect rank.
        </p>
        <Link href={`/l/${slug}/report` as Route}>Report this listing</Link>
      </aside>
    </main>
  );
}
