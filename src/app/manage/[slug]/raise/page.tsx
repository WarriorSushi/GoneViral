import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { BackArrowIcon } from "@/components/icons/back-arrow-icon";
import { RaiseForm } from "@/components/owner/raise-form";
import { formatInr, moneyPaise } from "@/domain/money";
import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import {
  calculateMinimumRaise,
  calculateTakeoverQuote,
} from "@/domain/ranking";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { toIstBusinessDate } from "@/domain/today";
import {
  getPublicListingDetail,
  listMainBoard,
  listTodayBoard,
} from "@/server/db/repositories/leaderboards";
import { requireOwnerListingBySlug } from "@/server/db/repositories/private/owners";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Raise listing",
};

export default async function RaisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { slug } = await params;
  const businessDate = toIstBusinessDate(new Date());
  const [listing, board, dailyBoard, publicListing] = await Promise.all([
    requireOwnerListingBySlug(slug, user.id),
    listMainBoard({ cursor: null, limit: 20 }),
    listTodayBoard({ businessDate, cursor: null, limit: 50 }),
    getPublicListingDetail({ businessDate, slug }),
  ]);
  if (
    !listing ||
    listing.lifecycleStatus === "removed" ||
    listing.moderationStatus === "suspended"
  )
    notFound();
  const minimum = calculateMinimumRaise(
    moneyPaise(BigInt(listing.originalSponsorshipPaise)),
  );
  const allTimeTargets = board.entries
    .filter((target) => target.slug !== slug)
    .map((target) => {
      const quote = calculateTakeoverQuote({
        listingCurrentTotalPaise: moneyPaise(
          BigInt(listing.confirmedTotalPaise),
        ),
        minimumRequiredPaise: minimum.minimumRequiredPaise,
        targetTotalPaise: moneyPaise(BigInt(target.confirmedTotalPaise)),
      });
      return {
        name: target.name,
        quoteRupees: (quote.requiredPaymentPaise / 100n).toString(),
        rank: target.rank,
        slug: target.slug,
      };
    });
  const buyerDaily = moneyPaise(BigInt(publicListing?.todayNetPaise ?? "0"));
  const dailyTargets = dailyBoard.entries
    .filter((target) => target.slug !== slug)
    .map((target) => {
      const quote = calculateTakeoverQuote({
        listingCurrentTotalPaise: buyerDaily,
        minimumRequiredPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
        targetTotalPaise: moneyPaise(BigInt(target.todayNetPaise)),
      });
      return {
        name: target.name,
        quoteRupees: (quote.requiredPaymentPaise / 100n).toString(),
        rank: target.rank,
        slug: target.slug,
      };
    });
  return (
    <main className="manage-main" id="main-content">
      <Link className="owner-back-link" href={`/manage/${slug}` as Route}>
        <BackArrowIcon />
        <span>Listing overview</span>
      </Link>
      <div className="manage-heading">
        <div>
          <p className="eyebrow">Owner-only raise</p>
          <h1>Raise {listing.name}</h1>
          <p>
            Current total{" "}
            {formatInr(moneyPaise(BigInt(listing.confirmedTotalPaise)))}.
            Original payment{" "}
            {formatInr(moneyPaise(BigInt(listing.originalSponsorshipPaise)))}{" "}
            never changes.
          </p>
        </div>
      </div>
      <section className="manage-auth-card owner-raise-card">
        <RaiseForm
          allTimeTargets={allTimeTargets}
          dailyTargets={dailyTargets}
          minimumRupees={(minimum.minimumRequiredPaise / 100n).toString()}
          slug={slug}
        />
      </section>
    </main>
  );
}
