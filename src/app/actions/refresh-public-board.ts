"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { PUBLIC_CACHE_TAGS } from "@/server/cache/tags";

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

export async function refreshPublicBoard(formData: FormData): Promise<void> {
  const parsed = refreshRequestSchema.safeParse({
    kind: formData.get("kind"),
    businessDate: formData.get("businessDate") ?? undefined,
    slug: formData.get("slug") ?? undefined,
  });

  if (!parsed.success) {
    return;
  }

  switch (parsed.data.kind) {
    case "main":
      updateTag(PUBLIC_CACHE_TAGS.main);
      return;
    case "today":
      updateTag(PUBLIC_CACHE_TAGS.today(parsed.data.businessDate));
      return;
    case "category":
      updateTag(PUBLIC_CACHE_TAGS.category(parsed.data.slug));
      return;
    case "listing":
      updateTag(PUBLIC_CACHE_TAGS.listingSlug(parsed.data.slug));
      updateTag(PUBLIC_CACHE_TAGS.activity);
  }
}
