import "server-only";

import { z } from "zod";

import { PUBLIC_CACHE_TAGS } from "./tags";

const refreshRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("main") }),
  z.object({ kind: z.literal("today"), businessDate: z.string().date() }),
  z.object({
    kind: z.literal("category"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  z.object({
    kind: z.literal("listing"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
]);

export function publicRefreshTags(formData: FormData): readonly string[] {
  const parsed = refreshRequestSchema.safeParse({
    kind: formData.get("kind"),
    businessDate: formData.get("businessDate") ?? undefined,
    slug: formData.get("slug") ?? undefined,
  });
  if (!parsed.success) return [];

  switch (parsed.data.kind) {
    case "main":
      return [PUBLIC_CACHE_TAGS.main, PUBLIC_CACHE_TAGS.activity];
    case "today":
      return [PUBLIC_CACHE_TAGS.today(parsed.data.businessDate)];
    case "category":
      return [PUBLIC_CACHE_TAGS.category(parsed.data.slug)];
    case "listing":
      return [
        PUBLIC_CACHE_TAGS.listingSlug(parsed.data.slug),
        PUBLIC_CACHE_TAGS.activity,
      ];
  }
}
