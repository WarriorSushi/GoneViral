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
      href={entry.destinationUrl}
    >
      {entry.logoUrl ? (
        <Image
          alt={`${entry.name} logo`}
          className="listing-mark listing-logo"
          height={48}
          src={entry.logoUrl}
          width={48}
        />
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
        Take #{entry.rank} ·{" "}
        <Money paise={entry.takeoverQuote.requiredPaymentPaise} />
      </Link>
      <small>Estimate. Spot not held.</small>
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
      </div>
    );
  }

  return (
    <div className="board-amount">
      <Money paise={entry.confirmedTotalPaise} />
      <small>current total</small>
    </div>
  );
}

function InvitationRow({ rank }: { readonly rank: string }) {
  return (
    <div className="invitation-row" data-testid="invitation-row">
      <span className="rank">#{rank}</span>
      <div>
        <strong>Want in?</strong>
        <p>Join the paid list.</p>
      </div>
      <div className="invitation-action">
        <span>Starts at</span>
        <Money paise={INITIAL_SPONSORSHIP_MIN_PAISE.toString()} />
      </div>
    </div>
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
        {today ? "Be first today." : "No one is here. Yet."}
      </h2>
      <p>
        {today
          ? "Pay first. Take the top spot."
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
  nextCursor,
  pageHref,
  today = false,
}: {
  readonly entries: readonly BoardEntry[];
  readonly nextCursor: string | null;
  readonly pageHref: string;
  readonly today?: boolean;
}) {
  if (entries.length === 0) {
    return <EmptyBoard today={today} />;
  }

  const invitationRank = (BigInt(entries.at(-1)!.rank) + 1n).toString();
  const showInvitation = entries.length < 10 && !nextCursor;

  return (
    <div className="leaderboard" data-testid="leaderboard">
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
      </ol>

      {showInvitation ? <InvitationRow rank={invitationRank} /> : null}
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
