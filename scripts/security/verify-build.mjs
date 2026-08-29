import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const staticRoot = path.resolve(".next", "static");
const forbiddenMarkers = [
  "CRON_SECRET",
  "DATABASE_DIRECT_URL",
  "DATABASE_URL",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "PRIVATE_DATA_ENCRYPTION_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "SENTRY_AUTH_TOKEN",
  "SUPABASE_SECRET_KEY",
];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(target)));
    else files.push(target);
  }
  return files;
}

const files = await filesBelow(staticRoot);
const sourceMaps = files.filter((file) => file.endsWith(".map"));
assert.deepEqual(
  sourceMaps,
  [],
  "Browser source maps must not be publicly emitted after the Sentry upload boundary.",
);

const clientFiles = files.filter((file) => /\.(?:js|json)$/.test(file));
for (const file of clientFiles) {
  const contents = await readFile(file, "utf8");
  for (const marker of forbiddenMarkers) {
    assert.equal(
      contents.includes(marker),
      false,
      `${marker} leaked into ${path.relative(process.cwd(), file)}`,
    );
  }
  assert.doesNotMatch(contents, /\b(?:sk|re)_(?:live|test)_[A-Za-z0-9]{12,}\b/);
}

console.info(
  `Client build security verification passed: ${clientFiles.length} static JS/JSON assets, no public source maps or server-secret markers.`,
);
