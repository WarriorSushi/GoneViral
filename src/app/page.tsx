import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardPage } from "@/components/public/board-page";
import { publicPageMetadata } from "@/config/seo";
import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import { PUBLIC_BOARD_PAGE_SIZE } from "@/domain/public-board";
import {
  getCachedMainBoard,
  getCachedPublicActivity,
  getCachedPublicCategories,
} from "@/server/cache/public-read-model";
import {
  estimateNewListingRank,
  parseMainBoardCursor,
} from "@/server/db/repositories/leaderboards";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Pay more, rank higher on India’s transparent public paid leaderboard.",
  path: "/",
  title: "Pay more. Rank higher.",
});

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const rawCursor = Array.isArray(searchParams.cursor)
    ? searchParams.cursor[0]
    : searchParams.cursor;
  const cursor = parseMainBoardCursor(rawCursor);

  if (!cursor.ok) {
    notFound();
  }

  const [board, categories, activity] = await Promise.all([
    getCachedMainBoard(cursor.value),
    getCachedPublicCategories(),
    getCachedPublicActivity(),
  ]);
  let projectedAcquisitionRank: string | null = null;

  if (
    cursor.value === null &&
    board.entries.length > 0 &&
    board.entries.length < PUBLIC_BOARD_PAGE_SIZE &&
    !board.nextCursor
  ) {
    try {
      const projection = await estimateNewListingRank({
        amountPaise: INITIAL_SPONSORSHIP_MIN_PAISE,
      });
      projectedAcquisitionRank = projection.estimatedRank;
    } catch {
      projectedAcquisitionRank = null;
    }
  }

  return (
    <BoardPage
      activeBoard="main"
      activity={activity}
      categories={categories}
      entries={board.entries}
      generatedAt={board.generatedAt}
      helper="Put your brand, product or profile on the board. Higher confirmed spend takes the higher spot."
      isPaginated={cursor.value !== null}
      nextCursor={board.nextCursor}
      pageHref="/"
      projectedAcquisitionRank={projectedAcquisitionRank}
      refreshContext={{ kind: "main" }}
      title="Pay more. Rank higher."
    />
  );
}
