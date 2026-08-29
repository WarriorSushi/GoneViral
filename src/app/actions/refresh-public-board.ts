"use server";

import { updateTag } from "next/cache";

import { publicRefreshTags } from "@/server/cache/public-refresh";

export async function refreshPublicBoard(formData: FormData): Promise<void> {
  for (const tag of publicRefreshTags(formData)) {
    updateTag(tag);
  }
}
