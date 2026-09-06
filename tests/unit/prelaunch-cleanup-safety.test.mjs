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
    expect(cleanup).toContain(
      "data.users.every((user) => retainedAdminUserIds.has(user.id))",
    );
    expect(cleanup).toContain("remainingAuthUsers !== 1");
  });

  it("uses temporary linked credentials instead of exporting Vercel secrets", () => {
    expect(cleanup).toContain('"db",\n  "dump",\n  "--linked"');
    expect(cleanup).toContain('"projects",\n    "api-keys"');
    expect(cleanup).not.toContain("process.env.DATABASE_DIRECT_URL");
    expect(cleanup).not.toContain("process.env.SUPABASE_SECRET_KEY");
  });

  it("assumes the authorized postgres role for private-schema cleanup", () => {
    expect(cleanup).toContain("await sql`SET ROLE postgres`");
  });
});
