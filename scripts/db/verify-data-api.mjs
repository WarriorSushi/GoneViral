import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);

const apiUrl = status.API_URL;
const publishableKey = status.PUBLISHABLE_KEY;

assert.equal(typeof apiUrl, "string");
assert.equal(typeof publishableKey, "string");

for (const schema of ["app", "private"]) {
  const response = await fetch(`${apiUrl}/rest/v1/categories?select=*`, {
    headers: {
      Accept: "application/json",
      "Accept-Profile": schema,
      apikey: publishableKey,
    },
  });

  assert.equal(
    response.status,
    406,
    `The ${schema} schema must not be selectable through the Data API.`,
  );
  const body = await response.json();
  assert.equal(body.code, "PGRST106");
}

const publicResponse = await fetch(`${apiUrl}/rest/v1/categories?select=*`, {
  headers: {
    Accept: "application/json",
    apikey: publishableKey,
  },
});
assert.equal(publicResponse.status, 404);

console.log(
  "Data API verification passed: app/private are unexposed and no public categories table exists.",
);
