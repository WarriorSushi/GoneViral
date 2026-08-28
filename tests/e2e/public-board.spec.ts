import { execFileSync } from "node:child_process";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import postgres from "postgres";

const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const privateMarkers = [
  "@example.test",
  "synthetic-hmac",
  "fixture-idempotency",
  "fixture-request",
  "pending_listing_owners",
  "payment_attempts",
];

function fixtures(command: "clear" | "seed") {
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", command], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_DIRECT_URL: directDatabaseUrl,
      NODE_ENV: "test",
    },
    stdio: "pipe",
  });
}

async function expectNoPrivateMarkers(content: string) {
  for (const marker of privateMarkers) {
    expect(content, `private marker leaked: ${marker}`).not.toContain(marker);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath(`${name}.png`),
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => fixtures("clear"));
test.afterAll(() => fixtures("clear"));

test("production build renders a truthful empty board", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.getByTestId("board-empty")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "No one is here. Yet.",
  );
  await expect(
    page.getByText("Get on the leaderboard from ₹499."),
  ).toBeVisible();
  await expect(page.getByText("NOT LIVE DATA")).toHaveCount(0);
  await expect(page.getByTestId("leaderboard")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoPrivateMarkers(await page.content());
  expect(consoleErrors).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-empty`);
});

test("signed-out management is generic, same-origin, and not publicly cached", async ({
  page,
}, testInfo) => {
  const response = await page.goto("/manage");
  expect(response?.ok()).toBe(true);
  expect(response?.headers()["cache-control"] ?? "").not.toMatch(
    /public|max-age=[1-9]/i,
  );
  await expect(
    page.getByRole("heading", { name: "Manage your GoneViral listing" }),
  ).toBeVisible();
  const applicationOrigin = new URL(page.url()).origin;
  await page
    .getByLabel("Email used to sponsor")
    .fill(`not-associated-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Send secure link" }).click();
  await expect(
    page.getByText(
      "If that email can manage a listing, a secure link is on its way.",
    ),
  ).toBeVisible();

  await page.goto("/auth/callback?next=https%3A%2F%2Fevil.example%2Fmanage");
  await expect(page).toHaveURL(/\/manage\?error=auth$/);
  await expect(
    page.getByRole("heading", { name: "Manage your GoneViral listing" }),
  ).toBeVisible();
  expect(new URL(page.url()).origin).toBe(applicationOrigin);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, `${testInfo.project.name}-manage-signed-out`);
});

test("low-population Main board is first-viewport, accessible, and private-data safe", async ({
  page,
}, testInfo) => {
  fixtures("seed");
  await page.goto("/");
  await page.getByRole("button", { name: "Refresh board" }).click();
  await expect(page.getByTestId("leaderboard")).toBeVisible();
  const monsoonWebsite = page.getByRole("link", {
    name: "Visit Monsoon Studio website",
  });
  await expect(monsoonWebsite).toBeVisible();
  await expect(monsoonWebsite).toHaveAttribute(
    "href",
    "https://monsoon-studio.example.test",
  );
  await expect(
    page.getByRole("link", { name: "More info about Monsoon Studio" }),
  ).toBeVisible();
  await expect(page.getByTestId("invitation-row")).toContainText("Want in?");
  await expect(
    page
      .getByTestId("leaderboard")
      .locator('.money:visible:text-is("₹25,000")')
      .first(),
  ).toBeVisible();
  const firstCard = page
    .locator(".leaderboard-card")
    .filter({ has: monsoonWebsite });
  await expect(
    firstCard.getByText("B2B & Services", { exact: true }),
  ).toBeVisible();
  await expect(
    firstCard.getByText("monsoon-studio.example.test", { exact: true }),
  ).toBeVisible();
  const rankAction = firstCard.getByRole("link", { name: /Take #1/ });
  const rankActionWrap = rankAction.locator("..");

  if (testInfo.project.name === "desktop-1440") {
    await expect(rankActionWrap).toHaveCSS("opacity", "0");
    await firstCard.hover();
    await expect(rankActionWrap).toHaveCSS("opacity", "1");
    const cardBox = await firstCard.boundingBox();
    const actionBox = await rankAction.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(
      Math.abs(actionBox!.y + actionBox!.height / 2 - cardBox!.y),
    ).toBeLessThan(3);
  } else {
    await expect(rankAction).toBeVisible();
  }

  const boardBox = await page.getByTestId("leaderboard").boundingBox();
  expect(boardBox).not.toBeNull();
  if (testInfo.project.name === "desktop-1440") {
    expect(boardBox!.width).toBeLessThanOrEqual(1081);
    const amountFontSize = await firstCard
      .locator(".board-amount > .money")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    expect(amountFontSize).toBeLessThanOrEqual(20);
    expect(boardBox!.y).toBeLessThan(
      testInfo.project.use.viewport?.height ?? 900,
    );
  }
  await expectNoHorizontalOverflow(page);
  await expectNoPrivateMarkers(await page.content());
  await expect(page).toHaveTitle("Main board");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-low-population`);
});

test("Main, Today, category, and listing navigation use real public projections", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const todayResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/today") &&
      response.headers()["content-type"]?.includes("text/x-component") === true,
  );
  await page.getByRole("link", { name: "Today", exact: true }).first().click();
  const todayResponse = await todayResponsePromise;
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Who moved up today?",
  );
  await expect(
    page.locator('.money:visible:text-is("₹12,500")').first(),
  ).toBeVisible();
  await expectNoPrivateMarkers(await todayResponse.text());

  await page.getByRole("link", { name: "Tech & Apps", exact: true }).click();
  await expect(page).toHaveURL(/\/category\/tech-apps$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tech & Apps",
  );
  await expect(
    page.getByRole("link", { name: "Visit Plotline website" }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "All", exact: true }).click();
  await page.route("https://monsoon-studio.example.test/", async (route) => {
    await route.fulfill({
      body: "<!doctype html><title>Monsoon Studio</title><h1>Advertiser site</h1>",
      contentType: "text/html",
    });
  });
  await page
    .getByRole("link", { name: "Visit Monsoon Studio website" })
    .click();
  await expect(page).toHaveURL("https://monsoon-studio.example.test/");
  await expect(
    page.getByRole("heading", { name: "Advertiser site" }),
  ).toBeVisible();
  await page.goBack();
  await page
    .getByRole("link", { name: "More info about Monsoon Studio" })
    .click();
  await expect(page).toHaveURL(/\/l\/monsoon-studio$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Monsoon Studio",
  );
  await expect(
    page.getByRole("heading", { name: "Payment history" }),
  ).toBeVisible();
  await expect(page.getByText("Joined the list")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Visit Monsoon Studio website" }),
  ).toHaveAttribute("href", "https://monsoon-studio.example.test");
  await expectNoPrivateMarkers(await page.content());
  await capture(page, testInfo, `${testInfo.project.name}-listing`);

  await page.goto("/how-it-works");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pay. Get seen." }),
  ).toBeVisible();
  await expect(
    page.getByText("No sign-up. No API. No nonsense."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Three steps" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const howAccessibility = await new AxeBuilder({ page }).analyze();
  expect(howAccessibility.violations).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-how-it-works`);
});

test("guest join reaches an honest pending flow without browser authority", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/join");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Put your link",
  );
  await page
    .getByRole("button", { name: "Continue to secure checkout" })
    .click();
  await expect(
    page.getByText("Enter a name of 80 characters or fewer."),
  ).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  const suffix = `${Date.now()}-${testInfo.project.name}`;
  await page.getByLabel("Name").fill("Phase Four Studio");
  await page.getByLabel("Category").selectOption("tech-apps");
  await page
    .getByLabel("Tagline")
    .fill("A safe local checkout verification listing");
  await page
    .getByLabel("Website URL")
    .fill(`https://${suffix}.example.com/path`);
  await page.getByLabel("Email").fill(`phase4-${suffix}@example.com`);
  await page.getByLabel("Phone").fill("+919876543210");
  await page.getByLabel(/I accept the/).check();
  await page
    .getByRole("button", { name: "Continue to secure checkout" })
    .click();

  await expect(page).toHaveURL(/\/join\/att_[A-Za-z0-9_-]{24}\/mock-checkout$/);
  await expect(
    page.getByText("same Dodo webhook path used by test mode"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Return without paying" }).click();
  await expect(page).toHaveURL(/\/join\/att_[A-Za-z0-9_-]{24}\/pending$/);
  const attemptPublicId = new URL(page.url()).pathname.split("/")[2]!;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "We’re checking your payment.",
  );
  await expect(page.getByText("Your listing is not live yet.")).toBeVisible();
  await expect(page.getByText(/payment successful/i)).toHaveCount(0);
  await expectNoPrivateMarkers(await page.content());

  const statusResponse = await page.request.get(
    `/api/join/${attemptPublicId}/status`,
  );
  expect(statusResponse.status()).toBe(200);
  expect(await statusResponse.json()).toEqual({ status: "pending" });

  const verificationSql = postgres(directDatabaseUrl, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  try {
    const [databaseState] = await verificationSql<
      {
        confirmed_total_paise: bigint;
        ledger_count: bigint;
        lifecycle_status: string;
      }[]
    >`
      select l.lifecycle_status, l.confirmed_total_paise,
             count(fl.id) as ledger_count
      from private.payment_attempts pa
      join app.listings l on l.id = pa.listing_id
      left join private.financial_ledger fl on fl.payment_attempt_id = pa.id
      where pa.public_id = ${attemptPublicId}
      group by l.id
    `;
    expect(databaseState).toEqual({
      confirmed_total_paise: 0n,
      ledger_count: 0n,
      lifecycle_status: "payment_pending",
    });
  } finally {
    await verificationSql.end({ timeout: 5 });
  }
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-phase4-pending`);
});

test("signed mock webhook moves pending to confirmed and updates the board", async ({
  page,
}, testInfo) => {
  const suffix = `confirmed-${Date.now()}-${testInfo.project.name}`;
  await page.goto("/join");
  await page.getByLabel("Name").fill("Phase Five Studio");
  await page.getByLabel("Category").selectOption("tech-apps");
  await page
    .getByLabel("Tagline")
    .fill("A signed webhook confirmation verification listing");
  await page
    .getByLabel("Website URL")
    .fill(`https://${suffix}.example.com/path`);
  await page.getByLabel("Email").fill(`${suffix}@example.com`);
  await page.getByLabel("Phone").fill("+919876543210");
  await page.getByLabel(/I accept the/).check();
  await page
    .getByRole("button", { name: "Continue to secure checkout" })
    .click();

  await page.getByRole("link", { name: "Return without paying" }).click();
  await expect(page.getByText("Your listing is not live yet.")).toBeVisible();
  await expect(page.getByText(/Payment confirmed/i)).toHaveCount(0);
  const attemptPublicId = new URL(page.url()).pathname.split("/")[2]!;

  const completion = await page.request.post("/api/mock/dodo/complete", {
    form: { publicId: attemptPublicId },
    maxRedirects: 0,
  });
  expect(completion.status()).toBe(303);
  await expect(page).toHaveURL(
    new RegExp(`/join/${attemptPublicId}/confirmed$`),
    { timeout: 12_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Phase Five Studio is confirmed." }),
  ).toBeVisible();
  await expect(page.getByText("actual leaderboard position")).toContainText(
    "#6",
  );
  await expect(page.getByText(/only an estimate/)).toBeVisible();
  await expect(page.getByText(/queued a confirmation/)).toBeVisible();
  await expect(page.getByText(/already arrived/)).toBeVisible();

  const verificationSql = postgres(directDatabaseUrl, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  try {
    const [databaseState] = await verificationSql<
      {
        event_count: bigint;
        ledger_count: bigint;
        outbox_count: bigint;
        total: bigint;
      }[]
    >`
      SELECT l.confirmed_total_paise AS total,
             (SELECT count(*) FROM private.financial_ledger fl
              WHERE fl.payment_attempt_id = pa.id) AS ledger_count,
             (SELECT count(*) FROM private.provider_events pe
              WHERE pe.payment_attempt_id = pa.id
                AND pe.processing_state = 'processed') AS event_count,
             (SELECT count(*) FROM private.email_outbox eo
              WHERE eo.idempotency_key LIKE 'sponsorship-confirmed:' || pa.id || '%')
               AS outbox_count
      FROM private.payment_attempts pa
      JOIN app.listings l ON l.id = pa.listing_id
      WHERE pa.public_id = ${attemptPublicId}
    `;
    expect(databaseState).toEqual({
      event_count: 1n,
      ledger_count: 1n,
      outbox_count: 1n,
      total: 49_900n,
    });
  } finally {
    await verificationSql.end({ timeout: 5 });
  }

  await page.getByRole("link", { name: "See the leaderboard" }).click();
  await page.getByRole("button", { name: "Refresh board" }).click();
  await expect(
    page.getByRole("link", { name: "Visit Phase Five Studio" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Main board/);
  await expectNoPrivateMarkers(await page.content());
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-phase5-confirmed`);
});

test("verified local Supabase user claims once and IDOR/revocation stay blocked", async ({
  context,
  page,
}, testInfo) => {
  const fixtureSql = postgres(directDatabaseUrl, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const ownerRows = await fixtureSql<
    { canonical_email: string; id: string; slug: string }[]
  >`
    SELECT pending.canonical_email, listing.id, listing.slug
    FROM app.listings AS listing
    JOIN private.pending_listing_owners AS pending
      ON pending.listing_id = listing.id
    JOIN private.payment_attempts AS attempt
      ON attempt.id = pending.created_from_attempt_id
    WHERE listing.name = 'Phase Five Studio'
      AND attempt.state = 'succeeded'
    ORDER BY listing.created_at DESC
    LIMIT 1
  `;
  const ownerFixture = ownerRows[0];
  if (!ownerFixture) throw new Error("Confirmed owner fixture was not found.");
  const { canonical_email: email, id: listingId, slug } = ownerFixture;
  const foreignRows = await fixtureSql<{ slug: string }[]>`
    SELECT slug FROM app.listings
    WHERE id <> ${listingId} AND lifecycle_status = 'active'
    ORDER BY confirmed_total_paise DESC LIMIT 1
  `;
  const foreignSlug = foreignRows[0]?.slug;
  if (!foreignSlug) throw new Error("Foreign listing fixture was not found.");

  const cookieJar = new Map<string, string>();
  const supabase = createServerClient(
    "http://127.0.0.1:54321",
    "local-publishable-key",
    {
      cookies: {
        getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
        setAll: (items) => {
          for (const item of items) cookieJar.set(item.name, item.value);
        },
      },
    },
  );
  const { data, error } = await supabase.auth.signUp({
    email,
    password: `local-${Date.now()}-${testInfo.project.name}-password`,
  });
  expect(error).toBeNull();
  expect(data.user?.email_confirmed_at).toBeTruthy();
  await page.goto("/");
  const applicationOrigin = new URL(page.url()).origin;
  await context.addCookies(
    [...cookieJar].map(([name, value]) => ({
      name,
      url: applicationOrigin,
      value,
    })),
  );

  await page.goto("/manage");
  await expect(
    page.getByRole("heading", { name: "Your listings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Phase Five Studio" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View listing" }).click();
  await expect(page).toHaveURL(new RegExp(`/manage/${slug}$`));
  await expect(
    page.getByRole("heading", { name: "Payment history" }),
  ).toBeVisible();
  const initialPayment = page.getByRole("row", {
    name: /Initial sponsorship/,
  });
  await expect(initialPayment).toBeVisible();
  await expect(initialPayment.getByLabel("₹499 Indian rupees")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Edit listing" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit Phase Five Studio" }),
  ).toBeVisible();
  const websiteInput = page.getByLabel("Website URL");
  const approvedWebsite = new URL(await websiteInput.inputValue());
  await page.getByLabel("Display name").fill("Phase Eight Reviewed Name");
  await page.getByLabel("Tagline").fill("Phase Eight safe tagline");
  await websiteInput.fill(`${approvedWebsite.origin}/safe-owner-path`);
  await page.getByLabel("Category").selectOption("brands-d2c");
  await page.getByRole("button", { name: "Save safe changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "2 safe changes published.",
  );
  await expect(page.getByRole("status")).toContainText(
    "2 sensitive changes sent for review",
  );
  await expect(page.getByLabel("Logo image")).toBeVisible();
  await expect(page.getByText(/strip metadata/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expectNoHorizontalOverflow(page);

  const [editState] = await fixtureSql<
    {
      category_slug: string;
      destination_url: string;
      name: string;
      pending_count: bigint;
      tagline: string;
    }[]
  >`
    SELECT listing.name, listing.tagline, listing.destination_url,
           category.slug AS category_slug,
           (SELECT count(*) FROM private.listing_change_requests request
            WHERE request.listing_id = listing.id AND request.state = 'pending')
             AS pending_count
    FROM app.listings AS listing
    JOIN app.categories AS category ON category.id = listing.category_id
    WHERE listing.id = ${listingId}
  `;
  expect(editState).toEqual({
    category_slug: "tech-apps",
    destination_url: `${approvedWebsite.origin}/safe-owner-path`,
    name: "Phase Five Studio",
    pending_count: 2n,
    tagline: "Phase Eight safe tagline",
  });
  await page.getByRole("link", { name: "Listing overview" }).click();

  await page.getByRole("link", { name: "Raise this listing" }).click();
  await expect(
    page.getByRole("heading", { name: "Raise Phase Five Studio" }),
  ).toBeVisible();
  await expect(
    page.getByText(/immutable original sponsorship: ₹1,000/i),
  ).toBeVisible();
  await page.getByLabel("Payment phone").fill("+919876543210");
  await page.getByRole("button", { name: "Continue to Dodo checkout" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete this mock raise" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete mock payment" }).click();
  await expect(
    page.getByRole("heading", {
      name: "₹1,000 Indian rupees was added.",
    }),
  ).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/Actual Main position:/)).toBeVisible();
  const [raiseState] = await fixtureSql<
    {
      original: bigint;
      raise_count: bigint;
      total: bigint;
    }[]
  >`
    SELECT listing.original_sponsorship_paise AS original,
           listing.confirmed_total_paise AS total,
           (SELECT count(*) FROM private.financial_ledger ledger
            WHERE ledger.listing_id = listing.id AND ledger.entry_type = 'raise') AS raise_count
    FROM app.listings AS listing WHERE listing.id = ${listingId}
  `;
  expect(raiseState).toEqual({
    original: 49_900n,
    raise_count: 1n,
    total: 149_900n,
  });

  await page.goto(`/manage/${foreignSlug}`);
  await expect(
    page.getByRole("heading", { name: "Page not found." }),
  ).toBeVisible();
  await expect(page.getByText("Private listing overview")).toHaveCount(0);

  await fixtureSql`
    UPDATE private.listing_owners SET revoked_at = now()
    WHERE listing_id = ${listingId} AND user_id = ${data.user!.id}
  `;
  await page.goto(`/manage/${slug}`);
  await expect(
    page.getByRole("heading", { name: "Page not found." }),
  ).toBeVisible();
  await expect(page.getByText("Private listing overview")).toHaveCount(0);
  await fixtureSql.end({ timeout: 5 });
  await capture(page, testInfo, `${testInfo.project.name}-manage-revoked`);
});

test("keyboard focus, 200% zoom, and reduced motion remain usable", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveCSS("outline-style", "solid");

  const transitionDuration = await page
    .getByRole("button", { name: "Refresh board" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
  await capture(page, testInfo, `${testInfo.project.name}-keyboard-focus`);

  if (testInfo.project.name === "desktop-1440") {
    await page.setViewportSize({ width: 720, height: 450 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("leaderboard")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "desktop-1440-zoom-200");
  }
});
