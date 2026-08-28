import { execFileSync } from "node:child_process";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

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
    "The first spot is open",
  );
  await expect(page.getByText("Get on the list from ₹499.")).toBeVisible();
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
  await expect(page.getByTestId("invitation-row")).toContainText(
    "Your work could be here",
  );
  await expect(
    page
      .getByTestId("leaderboard")
      .locator('.money:visible:text-is("₹25,000")')
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("leaderboard")
      .locator('small:visible:text-is("Estimate. Spot not held.")')
      .first(),
  ).toBeVisible();

  const boardBox = await page.getByTestId("leaderboard").boundingBox();
  expect(boardBox).not.toBeNull();
  if (testInfo.project.name === "desktop-1440") {
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
    page.getByRole("heading", { level: 1, name: "How it works" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Three steps" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const howAccessibility = await new AxeBuilder({ page }).analyze();
  expect(howAccessibility.violations).toEqual([]);
  await capture(page, testInfo, `${testInfo.project.name}-how-it-works`);
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
