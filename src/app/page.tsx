import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardPage } from "@/components/public/board-page";
import {
  getCachedMainBoard,
  getCachedPublicCategories,
} from "@/server/cache/public-read-model";
import { parseMainBoardCursor } from "@/server/db/repositories/leaderboards";

export const metadata: Metadata = {
  title: "Main board",
};

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const rawCursor = Array.isArray(searchParams.cursor)
    ? searchParams.cursor[0]
    : searchParams.cursor;
  const cursor = parseMainBoardCursor(rawCursor);

  if (!cursor.ok) {
    notFound();
  }

  const [board, categories] = await Promise.all([
    getCachedMainBoard(cursor.value),
    getCachedPublicCategories(),
  ]);

  return (
    <BoardPage
      activeBoard="main"
      categories={categories}
      entries={board.entries}
      eyebrow="THE SPONSORED INTERNET LEADERBOARD"
      generatedAt={board.generatedAt}
      helper="All-time confirmed cumulative sponsorship. Higher confirmed totals rank first; ties favour the listing that reached the total earlier."
      nextCursor={board.nextCursor}
      pageHref="/"
      refreshContext={{ kind: "main" }}
      title="Pay more. Rank higher."
    />
  );
}
