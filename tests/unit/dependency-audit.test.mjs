import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { classifyNpmAudit } from "../../scripts/security/run-dependency-audit.mjs";

const workflowPath = new URL("../../.github/workflows/ci.yml", import.meta.url);

describe("dependency audit fallback", () => {
  it("passes a clean npm audit and fails reported policy violations", () => {
    expect(classifyNpmAudit({ status: 0 })).toBe("clean");
    expect(
      classifyNpmAudit({
        status: 1,
        stdout: JSON.stringify({
          metadata: {
            vulnerabilities: { low: 0, moderate: 1, high: 0, critical: 0 },
          },
        }),
      }),
    ).toBe("vulnerabilities");
  });

  it("uses the fallback only for explicit npm audit availability failures", () => {
    expect(
      classifyNpmAudit({
        status: 1,
        stderr:
          "POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk error (23): The operation was aborted due to timeout",
      }),
    ).toBe("unavailable");
    expect(
      classifyNpmAudit({
        status: 1,
        stderr: "Audit endpoint responded with HTTP 503",
      }),
    ).toBe("unavailable");
    expect(
      classifyNpmAudit({ status: 1, stderr: "unexpected audit failure" }),
    ).toBe("failed");
  });

  it("runs a pinned OSV scan of pnpm-lock.yaml only when fallback is required", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain(
      "run: node scripts/security/run-dependency-audit.mjs",
    );
    expect(workflow).toContain(
      "if: steps.dependency-audit.outputs.fallback_required == 'true'",
    );
    expect(workflow).toMatch(
      /uses: google\/osv-scanner-action\/osv-scanner-action@[0-9a-f]{40}/,
    );
    expect(workflow).toContain("--lockfile=pnpm-lock.yaml");
  });
});
