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
    <Link className="listing-identity" href={`/l/${entry.slug}`}>
      <span className="listing-mark" aria-hidden="true">
        {initial}
      </span>
      <span>
        <strong>{entry.name}</strong>
        <small>{entry.tagline}</small>
        <em>{entry.category.name}</em>
      </span>
    </Link>
  );
}

function TakePositionLink({ entry }: { readonly entry: BoardEntry }) {
  return (
    <div className="take-position">
      <Link className="button button-quote" href={`/how-it-works#sponsoring`}>
        Take #{entry.rank} for{" "}
        <Money paise={entry.takeoverQuote.requiredPaymentPaise} />
      </Link>
      <small>Current estimate, not reserved</small>
    </div>
  );
}

function BoardAmount({ entry }: { readonly entry: BoardEntry }) {
  if (isTodayEntry(entry)) {
    return (
      <div className="board-amount">
        <Money paise={entry.todayNetPaise} />
        <small>
          <Money paise={entry.confirmedTotalPaise} /> lifetime
        </small>
      </div>
    );
  }

  return (
    <div className="board-amount">
      <Money paise={entry.confirmedTotalPaise} />
      <small>confirmed cumulative</small>
    </div>
  );
}

function InvitationRow({ rank }: { readonly rank: string }) {
  return (
    <div className="invitation-row" data-testid="invitation-row">
      <span className="rank">#{rank}</span>
      <div>
        <strong>This position could be yours</strong>
        <p>Real confirmation only. Checkout is not enabled yet.</p>
      </div>
      <div className="invitation-action">
        <span>Current minimum</span>
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
      <p className="eyebrow">THE FIRST REAL SIGNAL STARTS HERE</p>
      <h2 id="empty-title">
        {today ? "Today’s board is wide open." : "No one owns the board yet."}
      </h2>
      <p>
        {today
          ? "The first confirmed sponsorship today takes #1 here."
          : "The first confirmed sponsorship starts at ₹499."}
      </p>
      <Link className="button button-primary" href="/how-it-works#sponsoring">
        See how to take the first spot
      </Link>
      <small>Real payments only. No votes. No algorithm.</small>
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
      <div
        className="leaderboard-desktop"
        role="table"
        aria-label="Sponsored leaderboard"
      >
        <div className="leaderboard-header" role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Sponsor</span>
          <span role="columnheader">
            {today ? "Added today" : "Confirmed total"}
          </span>
          <span role="columnheader">Current estimate</span>
        </div>
        {entries.map((entry) => (
          <div
            className={`leaderboard-row rank-${entry.rank}`}
            role="row"
            key={entry.publicId}
          >
            <span className="rank" role="cell">
              #{entry.rank}
            </span>
            <div role="cell">
              <ListingIdentity entry={entry} />
            </div>
            <div role="cell">
              <BoardAmount entry={entry} />
            </div>
            <div role="cell">
              <TakePositionLink entry={entry} />
            </div>
          </div>
        ))}
      </div>

      <ol className="leaderboard-mobile" aria-label="Sponsored leaderboard">
        {entries.map((entry) => (
          <li
            className={`leaderboard-card rank-${entry.rank}`}
            key={entry.publicId}
          >
            <div className="mobile-row-top">
              <span className="rank">#{entry.rank}</span>
              <BoardAmount entry={entry} />
            </div>
            <ListingIdentity entry={entry} />
            <TakePositionLink entry={entry} />
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
