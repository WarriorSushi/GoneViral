import { refreshPublicBoard } from "@/app/actions/refresh-public-board";
import type {
  PublicCategory,
  PublicMainBoardEntry,
  PublicTodayBoardEntry,
} from "@/server/db/repositories/public-types";

import { BoardTabs, CategoryTabs } from "./board-navigation";
import { Leaderboard } from "./leaderboard";
import { SponsoredDisclosure } from "./sponsored-disclosure";

type RefreshContext =
  | Readonly<{ kind: "main" }>
  | Readonly<{ kind: "today"; businessDate: string }>
  | Readonly<{ kind: "category"; slug: string }>;

export function BoardPage({
  activeBoard,
  activeCategorySlug,
  categories,
  entries,
  generatedAt,
  helper,
  nextCursor,
  pageHref,
  refreshContext,
  title,
}: {
  readonly activeBoard: "main" | "today";
  readonly activeCategorySlug?: string;
  readonly categories: readonly PublicCategory[];
  readonly entries: readonly (PublicMainBoardEntry | PublicTodayBoardEntry)[];
  readonly generatedAt: string;
  readonly helper: string;
  readonly nextCursor: string | null;
  readonly pageHref: string;
  readonly refreshContext: RefreshContext;
  readonly title: string;
}) {
  return (
    <main id="main-content" className="public-main">
      <section className="board-intro" aria-labelledby="board-title">
        <div className="board-hero-copy">
          <h1 id="board-title">{title}</h1>
          <p>{helper}</p>
        </div>
      </section>

      <SponsoredDisclosure />

      <section className="board-controls" aria-label="Board controls">
        <BoardTabs active={activeBoard} />
        <CategoryTabs categories={categories} activeSlug={activeCategorySlug} />
        <div className="board-freshness">
          <p>
            Updated{" "}
            <time dateTime={generatedAt}>
              {new Date(generatedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </time>
          </p>
          <form action={refreshPublicBoard}>
            <input type="hidden" name="kind" value={refreshContext.kind} />
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
              Refresh
            </button>
          </form>
        </div>
      </section>

      <Leaderboard
        entries={entries}
        nextCursor={nextCursor}
        pageHref={pageHref}
        today={activeBoard === "today"}
      />
      <p className="estimate-note">
        Prices can change. We do not hold a spot before payment. Payments are
        not open yet.
      </p>
    </main>
  );
}
