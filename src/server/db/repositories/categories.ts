import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "../client";
import { categories } from "../schema";
import type { PublicCategory } from "./public-types";

export async function listActiveCategories(): Promise<PublicCategory[]> {
  return getDatabase()
    .select({
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
}
