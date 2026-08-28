import Link from "next/link";

import type { PublicCategory } from "@/server/db/repositories/public-types";

export function BoardTabs({ active }: { readonly active: "main" | "today" }) {
  return (
    <nav className="board-tabs" aria-label="Leaderboard views">
      <Link aria-current={active === "main" ? "page" : undefined} href="/">
        Main
      </Link>
      <Link
        aria-current={active === "today" ? "page" : undefined}
        href="/today"
      >
        Today
      </Link>
    </nav>
  );
}

export function CategoryTabs({
  activeSlug,
  categories,
}: {
  readonly activeSlug: string | undefined;
  readonly categories: readonly PublicCategory[];
}) {
  return (
    <nav className="category-tabs" aria-label="Leaderboard categories">
      <Link aria-current={!activeSlug ? "page" : undefined} href="/">
        All
      </Link>
      {categories.map((category) => (
        <Link
          aria-current={activeSlug === category.slug ? "page" : undefined}
          href={`/category/${category.slug}`}
          key={category.slug}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
