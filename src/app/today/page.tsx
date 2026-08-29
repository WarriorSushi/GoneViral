import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BoardPage } from "@/components/public/board-page";
import { publicPageMetadata } from "@/config/seo";
import { toIstBusinessDate } from "@/domain/today";
import {
  getCachedPublicCategories,
  getCachedTodayBoard,
} from "@/server/cache/public-read-model";
import { parseTodayBoardCursor } from "@/server/db/repositories/leaderboards";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Confirmed money added today, net of reversals posted today. Resets at midnight IST.",
  path: "/today",
  title: "Today’s board",
});

export default async function TodayPage(props: PageProps<"/today">) {
  await connection();
  const businessDate = toIstBusinessDate(new Date());
  const searchParams = await props.searchParams;
  const rawCursor = Array.isArray(searchParams.cursor)
    ? searchParams.cursor[0]
    : searchParams.cursor;
  const cursor = parseTodayBoardCursor(rawCursor);

  if (
    !cursor.ok ||
    (cursor.value && cursor.value.businessDate !== businessDate)
  ) {
    notFound();
  }

  const [board, categories] = await Promise.all([
    getCachedTodayBoard(businessDate, cursor.value),
    getCachedPublicCategories(),
  ]);

  return (
    <BoardPage
      activeBoard="today"
      categories={categories}
      entries={board.entries}
      generatedAt={board.generatedAt}
      helper="See who moved up today. The list starts over at midnight IST."
      nextCursor={board.nextCursor}
      pageHref="/today"
      refreshContext={{ kind: "today", businessDate }}
      title="Who moved up today?"
    />
  );
}
