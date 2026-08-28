import Link from "next/link";
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
  return (
    <a
      aria-label={`Visit ${entry.name} website`}
      className="listing-identity"
      href={entry.destinationUrl}
    >
      <span className="listing-mark" aria-hidden="true">
        {initial}
      </span>
      <span>
        <strong>
          {entry.name}{" "}
          <span className="external-arrow" aria-hidden="true">
            ↗
          </span>
        </strong>
        <small>{entry.tagline}</small>
        <em>{entry.category.name}</em>
      </span>
    </a>
  );
}

function TakePositionLink({ entry }: { readonly entry: BoardEntry }) {
  return (
    <div className="take-position">
      <Link className="button button-quote" href={`/how-it-works#join`}>
        Move to #{entry.rank} ·{" "}
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
        <strong>Your work could be here</strong>
        <p>Payments open soon.</p>
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
        {today ? "Be first today." : "The first spot is open."}
      </h2>
      <p>
        {today
          ? "The first payment today gets the top spot."
          : "Get on the list from ₹499."}
      </p>
      <Link className="button button-primary" href="/how-it-works#join">
        See how it works
      </Link>
      <small>Payments are not open yet.</small>
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
            <BoardAmount entry={entry} />
            <ListingActions entry={entry} />
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
