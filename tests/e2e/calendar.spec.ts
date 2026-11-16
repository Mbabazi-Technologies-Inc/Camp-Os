import { expect, test } from "@playwright/test";

// Demo mode shows sample calendar events on Home, and Settings explains how
// to connect Google Calendar when no Google credentials are configured.
test("demo: Home shows the calendar agenda and Settings offers Google Calendar", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await expect(page.getByText("Coming up on the calendar")).toBeVisible();
  await expect(page.getByText("Staff planning meeting")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Google Calendar" })).toBeVisible();
  await expect(page.getByText(/Confirmed retreat groups appear on the camp calendar/)).toBeVisible();
});
