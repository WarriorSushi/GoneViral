import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import { PUBLIC_BOARD_PAGE_SIZE } from "@/domain/public-board";
import type {
  PublicMainBoardEntry,
  PublicTodayBoardEntry,
} from "@/server/db/repositories/public-types";

import { Money } from "./money";

type BoardEntry = PublicMainBoardEntry | PublicTodayBoardEntry;

function RankMark({ rank }: { readonly rank: string }) {
  return (
    <div className="rank-cluster">
      <span className="rank">#{rank}</span>
      {rank === "1" ? (
        <span className="rank-leader" aria-hidden="true">
          Leader
        </span>
      ) : null}
    </div>
  );
}

function isTodayEntry(entry: BoardEntry): entry is PublicTodayBoardEntry {
  return "todayNetPaise" in entry;
}

function ListingIdentity({ entry }: { readonly entry: BoardEntry }) {
  const initial = entry.name.trim().charAt(0).toUpperCase();
  const destinationHost = new URL(entry.destinationUrl).hostname.replace(
    /^www\./,
    "",
  );
  return (
    <div className="listing-identity">
      <a
        aria-label={`Visit ${entry.name} website`}
        className="listing-destination"
        href={`/go/${entry.slug}`}
        rel="nofollow noopener"
      />
      {entry.logoUrl ? (
        <span className="listing-mark listing-logo-frame">
          <Image
            alt={`${entry.name} logo`}
            className="listing-logo"
            fill
            sizes="(max-width: 820px) 75px, 70px"
            src={entry.logoUrl}
          />
        </span>
      ) : (
        <span className="listing-mark" aria-hidden="true">
          {initial}
        </span>
      )}
      <span>
        <strong>
          {entry.name}{" "}
          <span className="external-arrow" aria-hidden="true">
            ↗
          </span>
        </strong>
        <small>{entry.tagline}</small>
        <span className="listing-meta">
          <em>{entry.category.name}</em>
          <span aria-hidden="true">·</span>
          <span className="listing-host">{destinationHost}</span>
          <span aria-hidden="true">·</span>
          <Link
            aria-label={`See details for ${entry.name}`}
            className="listing-detail-link"
            href={`/l/${entry.slug}`}
          >
            See details <span aria-hidden="true">→</span>
          </Link>
        </span>
      </span>
    </div>
  );
}

function TakePositionLink({ entry }: { readonly entry: BoardEntry }) {
  const daily = isTodayEntry(entry);
  return (
    <div className="take-position">
      <Link
        className="button button-quote"
        href={
          `/join?target=${encodeURIComponent(entry.slug)}${daily ? "&scope=daily" : ""}` as Route
        }
      >
        Take {daily ? "Daily " : ""}#{entry.rank} ·{" "}
        <Money paise={entry.takeoverQuote.requiredPaymentPaise} />
      </Link>
    </div>
  );
}

function ListingActions({ entry }: { readonly entry: BoardEntry }) {
  return (
    <div className="listing-actions">
      <TakePositionLink entry={entry} />
    </div>
  );
}

function BoardAmount({ entry }: { readonly entry: BoardEntry }) {
  if (isTodayEntry(entry)) {
    return (
      <div className="board-amount">
        <Money paise={entry.todayNetPaise} />
        <small>today</small>
        <small>
          <Money paise={entry.confirmedTotalPaise} /> all time
        </small>
        <small className="board-click-count">
          {entry.uniqueClicks} total clicks
        </small>
      </div>
    );
  }

  return (
    <div className="board-amount">
      <Money paise={entry.confirmedTotalPaise} />
      <small>confirmed total</small>
      <small className="board-click-count">
        {entry.uniqueClicks} total clicks
      </small>
    </div>
  );
}

function InvitationRow({ rank }: { readonly rank: string | null }) {
  return (
    <li className="invitation-row" data-testid="invitation-row">
      <span className="rank">{rank ? `#${rank}` : "—"}</span>
      <div className="invitation-copy">
        <strong>
          {rank ? `#${rank} could be yours` : "Your spot could be next"}
        </strong>
        <p>Your rank is confirmed after payment.</p>
      </div>
      <div className="invitation-action">
        <span className="invitation-price">
          From <Money paise={INITIAL_SPONSORSHIP_MIN_PAISE.toString()} />
        </span>
        <Link className="button button-claim-spot" href="/join">
          Get listed
        </Link>
      </div>
    </li>
  );
}

function EmptyBoard({
  category,
  today,
}: {
  readonly category: boolean;
  readonly today: boolean;
}) {
  if (category) {
    return (
      <section className="board-empty" data-testid="board-empty">
        <h2>No listings in this category yet.</h2>
        <div className="board-empty-actions">
          <Link className="button button-primary" href="/join">
            Get listed
          </Link>
          <Link className="button button-secondary" href="/">
            Browse all listings
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section
      className="board-empty"
      data-testid="board-empty"
      aria-labelledby="empty-title"
    >
      <h2 id="empty-title">
        {today ? "The daily board is wide open." : "No one is here. Yet."}
      </h2>
      <p>
        {today
          ? "The first confirmed payment of the current IST day takes #1 here."
          : "Get on the leaderboard from ₹499."}
      </p>
      <Link className="button button-primary" href="/join">
        Get listed
      </Link>
      <small>Placement changes only after payment confirmation.</small>
    </section>
  );
}

export function Leaderboard({
  entries,
  fillOpenPositions = false,
  isPaginated = false,
  nextCursor,
  pageHref,
  projectedAcquisitionRank = null,
  today = false,
}: {
  readonly entries: readonly BoardEntry[];
  readonly fillOpenPositions?: boolean;
  readonly isPaginated?: boolean;
  readonly nextCursor: string | null;
  readonly pageHref: string;
  readonly projectedAcquisitionRank?: string | null;
  readonly today?: boolean;
}) {
  if (entries.length === 0 && isPaginated) {
    return (
      <div className="leaderboard" data-testid="leaderboard">
        <p className="quiet-empty" data-testid="leaderboard-end">
          No more positions.
        </p>
      </div>
    );
  }

  if (entries.length === 0 && !fillOpenPositions) {
    return (
      <EmptyBoard category={pageHref.startsWith("/category/")} today={today} />
    );
  }

  const showAcquisitionRow =
    fillOpenPositions &&
    entries.length > 0 &&
    entries.length < PUBLIC_BOARD_PAGE_SIZE &&
    !isPaginated &&
    !nextCursor;

  return (
    <div className="leaderboard" data-testid="leaderboard">
      {entries.length === 0 ? (
        <EmptyBoard category={false} today={today} />
      ) : null}
      <ol className="leaderboard-list" aria-label="Paid leaderboard">
        {entries.map((entry, index) => {
          const hasFollowingEntry = index < entries.length - 1;
          const dividerLabel =
            entry.rank === "3" && hasFollowingEntry
              ? "Top 3"
              : entry.rank === "20" && (hasFollowingEntry || nextCursor)
                ? "Top 20"
                : null;

          return (
            <Fragment key={entry.publicId}>
              <li className={`leaderboard-card rank-${entry.rank}`}>
                <RankMark rank={entry.rank} />
                <ListingIdentity entry={entry} />
                <ListingActions entry={entry} />
                <BoardAmount entry={entry} />
              </li>
              {dividerLabel ? (
                <li
                  aria-label={`${dividerLabel} boundary`}
                  className="tier-divider"
                  data-testid={`tier-divider-${entry.rank}`}
                >
                  <span>{dividerLabel}</span>
                </li>
              ) : null}
            </Fragment>
          );
        })}
        {showAcquisitionRow ? (
          <InvitationRow rank={projectedAcquisitionRank} />
        ) : null}
      </ol>

      {nextCursor ? (
        <nav className="pagination" aria-label="Leaderboard pages">
          <Link
            className="button button-secondary"
            href={`${pageHref}?cursor=${nextCursor}` as Route}
          >
            Next {PUBLIC_BOARD_PAGE_SIZE} positions
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
