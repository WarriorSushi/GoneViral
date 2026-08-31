import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import type {
  PublicMainBoardEntry,
  PublicTodayBoardEntry,
} from "@/server/db/repositories/public-types";

import { Money } from "./money";

type BoardEntry = PublicMainBoardEntry | PublicTodayBoardEntry;

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
    <a
      aria-label={`Visit ${entry.name} website`}
      className="listing-identity"
      href={`/go/${entry.slug}`}
      rel="nofollow noopener"
    >
      {entry.logoUrl ? (
        <span className="listing-mark listing-logo-frame">
          <Image
            alt={`${entry.name} logo`}
            className="listing-logo"
            fill
            sizes="(max-width: 820px) 48px, 56px"
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
        </span>
      </span>
    </a>
  );
}

function TakePositionLink({ entry }: { readonly entry: BoardEntry }) {
  return (
    <div className="take-position">
      <Link
        className="button button-quote"
        href={`/join?target=${encodeURIComponent(entry.slug)}` as Route}
      >
        Take #{entry.rank} for{" "}
        <Money paise={entry.takeoverQuote.requiredPaymentPaise} />
      </Link>
    </div>
  );
}

function ListingActions({ entry }: { readonly entry: BoardEntry }) {
  return (
    <div className="listing-actions">
      <Link
        aria-label={`More info about ${entry.name}`}
        className="button button-secondary button-more-info"
        href={`/l/${entry.slug}`}
      >
        More info
      </Link>
      <TakePositionLink entry={entry} />
    </div>
  );
}

function BoardAmount({ entry }: { readonly entry: BoardEntry }) {
  if (isTodayEntry(entry)) {
    return (
      <div className="board-amount">
        <Money paise={entry.todayNetPaise} />
        <small>
          <Money paise={entry.confirmedTotalPaise} /> all time
        </small>
        <small>{entry.uniqueClicks} tracked clicks</small>
      </div>
    );
  }

  return (
    <div className="board-amount">
      <Money paise={entry.confirmedTotalPaise} />
      <small>current total</small>
      <small>{entry.uniqueClicks} tracked clicks</small>
    </div>
  );
}

function InvitationRow({ rank }: { readonly rank: string }) {
  return (
    <li className="invitation-row" data-testid="invitation-row">
      <span className="rank">#{rank}</span>
      <div className="invitation-copy">
        <strong>Room on the leaderboard</strong>
        <p>Your final rank is set after payment confirmation.</p>
      </div>
      <div className="invitation-action">
        <span className="invitation-price">
          From <Money paise={INITIAL_SPONSORSHIP_MIN_PAISE.toString()} />
        </span>
        <Link className="button button-claim-spot" href="/join">
          Join the leaderboard
        </Link>
      </div>
    </li>
  );
}

function EmptyBoard({ today }: { readonly today: boolean }) {
  return (
    <section
      className="board-empty"
      data-testid="board-empty"
      aria-labelledby="empty-title"
    >
      <h2 id="empty-title">
        {today ? "Today’s board is wide open." : "No one is here. Yet."}
      </h2>
      <p>
        {today
          ? "The first confirmed payment today takes #1 here."
          : "Get on the leaderboard from ₹499."}
      </p>
      <Link className="button button-primary" href="/join">
        Join the list
      </Link>
      <small>Placement changes only after payment confirmation.</small>
    </section>
  );
}

export function Leaderboard({
  entries,
  fillOpenPositions = false,
  nextCursor,
  pageHref,
  today = false,
}: {
  readonly entries: readonly BoardEntry[];
  readonly fillOpenPositions?: boolean;
  readonly nextCursor: string | null;
  readonly pageHref: string;
  readonly today?: boolean;
}) {
  if (entries.length === 0 && !fillOpenPositions) {
    return <EmptyBoard today={today} />;
  }

  const firstOpenRank = entries.length ? BigInt(entries.at(-1)!.rank) + 1n : 1n;
  const openRanks =
    fillOpenPositions && !nextCursor && firstOpenRank <= 10n
      ? Array.from({ length: Number(11n - firstOpenRank) }, (_, index) =>
          (firstOpenRank + BigInt(index)).toString(),
        )
      : [];

  return (
    <div className="leaderboard" data-testid="leaderboard">
      {entries.length === 0 ? <EmptyBoard today={today} /> : null}
      <ol className="leaderboard-list" aria-label="Paid leaderboard">
        {entries.map((entry) => (
          <li
            className={`leaderboard-card rank-${entry.rank}`}
            key={entry.publicId}
          >
            <span className="rank">#{entry.rank}</span>
            <ListingIdentity entry={entry} />
            <ListingActions entry={entry} />
            <BoardAmount entry={entry} />
          </li>
        ))}
        {openRanks.map((rank) => (
          <InvitationRow key={rank} rank={rank} />
        ))}
      </ol>

      {nextCursor ? (
        <div className="pagination">
          <Link
            className="button button-secondary"
            href={`${pageHref}?cursor=${nextCursor}` as Route}
          >
            Next positions
          </Link>
          <small>Stable cursor, no skipped positions in this snapshot.</small>
        </div>
      ) : null}
    </div>
  );
}
