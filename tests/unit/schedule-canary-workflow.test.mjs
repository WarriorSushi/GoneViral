import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const workflowPath = new URL(
  "../../.github/workflows/schedule-canary.yml",
  import.meta.url,
);

describe("schedule canary workflow", () => {
  it("isolates GitHub schedule delivery without credentials or external calls", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain('- cron: "2-57/5 * * * *"');
    expect(workflow).toContain('timezone: "Etc/UTC"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("permissions: {}");
    expect(workflow).toContain("group: goneviral-schedule-canary");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("timeout-minutes: 2");
    expect(workflow).toContain(
      'run: printf \'event=%s utc=%s\\n\' "$GITHUB_EVENT_NAME" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"',
    );

    expect(workflow).not.toMatch(/\b(?:https?|ftp):\/\//i);
    expect(workflow).not.toMatch(/\b(?:curl|wget)\b/i);
    expect(workflow).not.toContain("uses:");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).not.toContain("vars.");
    expect(workflow).not.toContain("pull_request_target");
  });
});
