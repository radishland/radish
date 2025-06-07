import { expect, test } from "playwright/test";

test("title", async ({ page }) => {
  await page.goto("http://localhost:1235/");

  // The root page has a title
  await expect(page).toHaveTitle("Radish test app");
});
