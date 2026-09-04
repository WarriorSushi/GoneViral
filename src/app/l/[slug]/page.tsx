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

function rankTier(rank: string) {
  const value = Number.parseInt(rank, 10);
  if (value <= 3) return "Top 3";
  if (value <= 10) return "Top 10";
  return `Ranked #${rank}`;
}

function ArrowUpRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5.5 5.7v5.5c0 4.1 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.7 6.5-9.8V5.7L12 3Z" />
      <path d="m9.1 12 1.8 1.8 4.2-4.3" />
    </svg>
  );
}

export default async function ListingPage(props: PageProps<"/l/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const businessDate = toIstBusinessDate(new Date());
  const listing = await getCachedPublicListingDetail(slug, businessDate);

  if (!listing) {
    notFound();
  }

  const tier = rankTier(listing.currentMainRank);
  const featuredSince = new Date(listing.featuredSince).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    },
  );
  const shareDescription =
    Number.parseInt(listing.currentMainRank, 10) <= 3
      ? "Let people know this listing is one of the leaderboard’s top picks."
      : "Turn this live leaderboard position into a ready-made social post.";

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
        <div className="listing-identity">
          {listing.logoUrl ? (
            <Image
              alt={`${listing.name} logo`}
              className="listing-mark listing-mark-large listing-logo"
              height={128}
              preload
              sizes="(max-width: 700px) 84px, 128px"
              src={listing.logoUrl}
              width={128}
            />
          ) : (
            <div className="listing-mark listing-mark-large" aria-hidden="true">
              {listing.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="listing-heading">
            <div className="listing-context">
              <span className="listing-category">{listing.category.name}</span>
              <span>
                Featured since{" "}
                <time dateTime={listing.featuredSince}>{featuredSince}</time>
              </span>
            </div>
            <h1>{listing.name}</h1>
            <p>{listing.tagline}</p>
            <div className="listing-destination">
              <span className="destination-label">
                {new URL(listing.destinationUrl).host}
              </span>
              <a
                aria-label={`Visit ${listing.name} website`}
                className="button button-secondary listing-visit"
                href={`/go/${listing.slug}`}
                rel="nofollow noopener"
              >
                Visit website
                <ArrowUpRightIcon />
              </a>
            </div>
          </div>
        </div>
        <aside
          className="listing-rank-block"
          aria-label="Current leaderboard ranks"
        >
          <div className="listing-rank-columns">
            <div>
              <span>Overall leaderboard</span>
              <strong>#{listing.currentMainRank}</strong>
              <small>{tier} overall</small>
            </div>
            <div>
              <span>Daily leaderboard</span>
              <strong>
                {listing.todayRank ? `#${listing.todayRank}` : "—"}
              </strong>
              <small>
                {listing.todayNetPaise ? (
                  <>
                    <Money paise={listing.todayNetPaise} /> net for current day
                  </>
                ) : (
                  "No paid movement in the current IST day"
                )}
              </small>
            </div>
          </div>
          <div className="listing-rank-total">
            <span>Total placement</span>
            <Money paise={listing.confirmedTotalPaise} />
          </div>
        </aside>
      </section>

      <section className="listing-challenge" aria-labelledby="challenge-title">
        <div className="listing-challenge-copy">
          <h2 id="challenge-title">Want this position?</h2>
          <p>
            <Money paise={listing.takeoverQuote.requiredPaymentPaise} />
            <span>estimated minimum to outrank this listing</span>
          </p>
          <small>
            A new listing would enter above this one at current totals. The spot
            is not held.
          </small>
        </div>
        <div className="listing-target-rank">
          <span>Estimated target</span>
          <strong>#{listing.takeoverQuote.targetRank}</strong>
          <small>overall</small>
        </div>
        <Link className="button button-primary" href="/how-it-works#join">
          Outrank this listing
          <ArrowUpRightIcon />
        </Link>
        <p className="listing-estimate-note">
          Estimate checked at{" "}
          <time dateTime={listing.takeoverQuote.estimatedAt}>
            {new Date(listing.takeoverQuote.estimatedAt).toLocaleTimeString(
              "en-IN",
              { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" },
            )}{" "}
            IST
          </time>
          . Checkout uses Dodo Payments.
        </p>
      </section>

      <ShareControls
        currentRank={listing.currentMainRank}
        description={shareDescription}
        heading={`Share your current #${listing.currentMainRank} position`}
        listingName={listing.name}
        listingPath={`/l/${listing.slug}`}
      />

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

      <footer className="listing-safety-note">
        <span>
          <ShieldIcon />
          Links are safety-checked by GoneViral
        </span>
        <Link href={`/l/${slug}/report` as Route}>Report listing</Link>
      </footer>
    </main>
  );
}
