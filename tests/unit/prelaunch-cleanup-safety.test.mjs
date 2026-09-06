import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const cleanup = await readFile(
  new URL("../../scripts/operations/prelaunch-cleanup.mjs", import.meta.url),
  "utf8",
);

describe("prelaunch cleanup safety boundary", () => {
  it.each([
    "private.admin_users",
    "private.site_visit_daily_totals",
    "private.site_visit_dedupe",
  ])("preserves %s", (table) => {
    expect(cleanup).toContain(`\"${table}\"`);
  });

  it("retains the linked active super-admin Auth user", () => {
    expect(cleanup).toContain("retainedAdminUserIds.has(user.id)");
    expect(cleanup).toContain("remainingAuthUsers !== 1");
  });
});
