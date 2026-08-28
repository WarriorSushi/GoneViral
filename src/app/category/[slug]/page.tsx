import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardPage } from "@/components/public/board-page";
import {
  getCachedMainBoard,
  getCachedPublicCategories,
} from "@/server/cache/public-read-model";
import { parseMainBoardCursor } from "@/server/db/repositories/leaderboards";

export async function generateMetadata(
  props: PageProps<"/category/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: `${slug.replaceAll("-", " ")} category` };
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
      eyebrow="CATEGORY BOARD · MAIN ORDER"
      generatedAt={board.generatedAt}
      helper={`The same cumulative Main ranking, filtered to ${category.name}. No separate category ledger or score.`}
      nextCursor={board.nextCursor}
      pageHref={`/category/${slug}`}
      refreshContext={{ kind: "category", slug }}
      title={category.name}
    />
  );
}
