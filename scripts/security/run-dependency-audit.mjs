import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const BLOCKING_SEVERITIES = new Set(["moderate", "high", "critical"]);
const AUDIT_SERVICE_PATTERN =
  /security\/advisories\/bulk|audit endpoint|ERR_PNPM_AUDIT/i;
const AVAILABILITY_FAILURE_PATTERN =
  /TimeoutError|timed? ?out|operation was aborted|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|ERR_SOCKET_TIMEOUT|fetch failed|socket hang up|(?:^|\D)5\d\d(?:\D|$)/i;

function countBlockingVulnerabilities(value) {
  if (!value || typeof value !== "object") return 0;

  const severityCounts = value.metadata?.vulnerabilities;
  if (severityCounts && typeof severityCounts === "object") {
    return [...BLOCKING_SEVERITIES].reduce(
      (total, severity) => total + Number(severityCounts[severity] ?? 0),
      0,
    );
  }

  const findings = [
    ...Object.values(value.advisories ?? {}),
    ...Object.values(value.vulnerabilities ?? {}),
  ];
  return findings.filter((finding) =>
    BLOCKING_SEVERITIES.has(String(finding?.severity ?? "").toLowerCase()),
  ).length;
}

export function classifyNpmAudit({ error, status, stderr = "", stdout = "" }) {
  if (status === 0) return "clean";

  try {
    if (countBlockingVulnerabilities(JSON.parse(stdout)) > 0) {
      return "vulnerabilities";
    }
  } catch {
    // Unexpected output remains fail-closed below.
  }

  if (error?.code === "ETIMEDOUT") return "unavailable";

  const output = `${stdout}\n${stderr}`;
  if (
    AUDIT_SERVICE_PATTERN.test(output) &&
    AVAILABILITY_FAILURE_PATTERN.test(output)
  ) {
    return "unavailable";
  }

  return "failed";
}

function setFallbackOutput(required) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `fallback_required=${required ? "true" : "false"}\n`,
    "utf8",
  );
}

export function runDependencyAudit() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    command,
    ["audit", "--audit-level=moderate", "--json"],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const classification = classifyNpmAudit(result);
  if (classification === "clean") {
    setFallbackOutput(false);
    console.info("npm dependency audit passed.");
    return 0;
  }

  if (classification === "unavailable") {
    setFallbackOutput(true);
    console.warn(
      "::warning::npm audit service unavailable; running the pinned OSV-Scanner fallback.",
    );
    return 0;
  }

  setFallbackOutput(false);
  if (classification === "vulnerabilities") {
    console.error("npm audit reported moderate-or-higher vulnerabilities.");
  } else {
    console.error(
      "npm audit failed for an unrecognized reason; refusing to use the availability fallback.",
    );
  }
  return result.status || 1;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = runDependencyAudit();
}
