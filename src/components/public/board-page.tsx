import Link from "next/link";

import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import { formatIstTime } from "@/domain/public-time";
import type {
  PublicCategory,
  PublicMainBoardEntry,
  PublicTodayBoardEntry,
  PublicActivityItem,
} from "@/server/db/repositories/public-types";

import { ActivityFeed } from "./activity-feed";
import { BoardTabs, CategoryTabs } from "./board-navigation";
import { Leaderboard } from "./leaderboard";
import { Money } from "./money";
import { SponsoredDisclosure } from "./sponsored-disclosure";

type RefreshContext =
  | Readonly<{ kind: "main" }>
  | Readonly<{ kind: "today"; businessDate: string }>
  | Readonly<{ kind: "category"; slug: string }>;

export function BoardPage({
  activeBoard,
  activeCategorySlug,
  activity,
  categories,
  entries,
  generatedAt,
  helper,
  isPaginated = false,
  nextCursor,
  pageHref,
  projectedAcquisitionRank = null,
  refreshContext,
  title,
}: {
  readonly activeBoard: "main" | "today";
  readonly activeCategorySlug?: string;
  readonly activity?: readonly PublicActivityItem[];
  readonly categories: readonly PublicCategory[];
  readonly entries: readonly (PublicMainBoardEntry | PublicTodayBoardEntry)[];
  readonly generatedAt: string;
  readonly helper: string;
  readonly isPaginated?: boolean;
  readonly nextCursor: string | null;
  readonly pageHref: string;
  readonly projectedAcquisitionRank?: string | null;
  readonly refreshContext: RefreshContext;
  readonly title: string;
}) {
  const isHomepage = pageHref === "/";

  return (
    <main id="main-content" className="public-main">
      <section
        className={isHomepage ? "board-intro board-intro-home" : "board-intro"}
        aria-labelledby="board-title"
      >
        <div className="board-hero-copy">
          {isHomepage ? (
            <p className="board-eyebrow">
              India&apos;s public sponsored leaderboard
            </p>
          ) : null}
          <h1 id="board-title">{title}</h1>
          <p>{helper}</p>
          {isHomepage ? (
            <>
              <div className="board-hero-actions">
                <Link className="button button-primary" href="/join">
                  <span>Get listed from</span>
                  <span className="board-hero-price" aria-label="499 rupees">
                    <Money paise={INITIAL_SPONSORSHIP_MIN_PAISE.toString()} />
                  </span>
                </Link>
                <Link className="board-hero-secondary" href="/how-it-works">
                  How it works <span aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {isHomepage ? null : <SponsoredDisclosure />}

      <section
        className="leaderboard-shell"
        aria-labelledby="leaderboard-title"
      >
        <div className="board-heading-row">
          <h2 id="leaderboard-title">Live leaderboard</h2>
          <div className="board-freshness">
            <p>
              <span className="freshness-prefix">Updated </span>
              <time dateTime={generatedAt}>
                {formatIstTime(generatedAt)} IST
              </time>
            </p>
            <form action="/actions/refresh-board" method="post">
              <input type="hidden" name="kind" value={refreshContext.kind} />
              <input type="hidden" name="returnTo" value={pageHref} />
              {refreshContext.kind === "today" ? (
                <input
                  type="hidden"
                  name="businessDate"
                  value={refreshContext.businessDate}
                />
              ) : null}
              {refreshContext.kind === "category" ? (
                <input type="hidden" name="slug" value={refreshContext.slug} />
              ) : null}
              <button
                aria-label="Refresh board"
                className="refresh-button"
                type="submit"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20">
                  <path d="M16.2 6.1A7 7 0 1 0 17 11" />
                  <path d="M16.2 2.8v3.8h-3.8" />
                </svg>
                <span className="refresh-label">Refresh</span>
              </button>
            </form>
          </div>
        </div>

        <div className="board-controls" aria-label="Board controls">
          <div className="board-control-group board-mode-group">
            <BoardTabs active={activeBoard} />
          </div>
          <div className="board-control-group category-group">
            <CategoryTabs
              categories={categories}
              activeSlug={activeCategorySlug}
            />
          </div>
        </div>

        <Leaderboard
          entries={entries}
          fillOpenPositions={pageHref === "/"}
          isPaginated={isPaginated}
          nextCursor={nextCursor}
          pageHref={pageHref}
          projectedAcquisitionRank={projectedAcquisitionRank}
          today={activeBoard === "today"}
        />
        <p className="estimate-note">
          Rank can change. Placement is confirmed only after payment.
        </p>
      </section>
      {activity ? <ActivityFeed items={activity} /> : null}
    </main>
  );
}
