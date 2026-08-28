import { execFileSync } from "node:child_process";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
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

test("guest join reaches only the honest pending flow", async ({
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
    page.getByText("does not mark a payment successful"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Return to GoneViral.in" }).click();
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
