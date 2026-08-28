import { expect, test } from "@playwright/test";

test("renders the truthful Phase 0 foundation without horizontal overflow", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Editorial signal, engineered first.",
  );
  await expect(
    page.getByLabel("Required sponsored ranking disclosure"),
  ).toContainText(
    "Positions are determined only by confirmed sponsorship amounts.",
  );
  await expect(page.getByText("NOT LIVE DATA")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
});
