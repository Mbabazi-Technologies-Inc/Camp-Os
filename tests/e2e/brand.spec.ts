import { expect, test } from "@playwright/test";
import { brand } from "../../lib/brand";
import { DEMO_CAMP_NAME } from "../../lib/demo/seed";

// Expects the main e2e build to use the product name lib/brand.ts resolves to
// here (don't set NEXT_PUBLIC_PRODUCT_NAME only in .env.local when testing).
//
// The login page carries the product's brand, never a camp's; inside the app
// the navigation shows the signed-in camp's own name.

test("login shows the product brand and no Mill Stream text", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(`Sign in · ${brand.name}`);
  await expect(page.getByText(brand.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/mill\s?stream/i);
  await expect(page.locator("body")).not.toContainText(/gmail drafts/i);
  await expect(page.getByText(/Nothing is ever sent for you/)).toHaveCount(1);

  await page.goto("/login?mode=signup");
  await expect(page).toHaveTitle(`Create account · ${brand.name}`);
  await expect(page.locator("body")).not.toContainText(/mill\s?stream/i);
});

test("demo: the navigation shows the demo camp's name", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page).toHaveTitle(`Today · ${brand.name}`);

  // Desktop shows the sidebar; phones show the top bar instead.
  const nav = testInfo.project.name === "mobile" ? page.locator("header").first() : page.locator("aside");
  await expect(nav.getByText(DEMO_CAMP_NAME, { exact: true })).toBeVisible();

  await page.goto("/email-assistant");
  await expect(page).toHaveTitle(`Email · ${brand.name}`);
});
