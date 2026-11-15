import { expect, test } from "@playwright/test";

// Runs against a build made with NEXT_PUBLIC_PRODUCT_NAME="TestName" (see the
// "rename" project in playwright.config.ts): renaming the product is one setting.
const RENAMED = "TestName";

test("NEXT_PUBLIC_PRODUCT_NAME renames the product on the login page and in titles", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(`Sign in · ${RENAMED}`);
  await expect(page.getByText(RENAMED, { exact: true }).filter({ visible: true }).first()).toBeVisible();

  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe(RENAMED);

  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // The app may prefix the title with an unread-chat count, e.g. "(3) ".
  await expect(page).toHaveTitle(new RegExp(`^(\\(\\d+\\) )?Today · ${RENAMED}$`));
});
