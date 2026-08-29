import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardPage } from "@/components/public/board-page";
import { publicPageMetadata } from "@/config/seo";
import {
  getCachedMainBoard,
  getCachedPublicCategories,
} from "@/server/cache/public-read-model";
import { parseMainBoardCursor } from "@/server/db/repositories/leaderboards";

export async function generateMetadata(
  props: PageProps<"/category/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const categories = await getCachedPublicCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category)
    return { robots: { index: false }, title: "Category unavailable" };
  return publicPageMetadata({
    description: `Paid leaderboard entries in ${category.name}, ordered by current confirmed totals.`,
    path: `/category/${slug}`,
    title: `${category.name} board`,
  });
}

export default async function CategoryPage(
  props: PageProps<"/category/[slug]">,
) {
  const [{ slug }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const rawCursor = Array.isArray(searchParams.cursor)
    ? searchParams.cursor[0]
    : searchParams.cursor;
  const cursor = parseMainBoardCursor(rawCursor);

  if (!cursor.ok) {
    notFound();
  }

  const categories = await getCachedPublicCategories();
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const board = await getCachedMainBoard(cursor.value, slug);
  return (
    <BoardPage
      activeBoard="main"
      activeCategorySlug={slug}
      categories={categories}
      entries={board.entries}
      generatedAt={board.generatedAt}
      helper={`See paid spots in ${category.name}.`}
      nextCursor={board.nextCursor}
      pageHref={`/category/${slug}`}
      refreshContext={{ kind: "category", slug }}
      title={category.name}
    />
  );
}
