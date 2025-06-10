import { expect, type Page, test } from "playwright/test";

test.describe("hydration", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const res = await (page.goto("http://localhost:1235/hydration"));
    expect(res?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("kicks in and pierces shadow roots", async () => {
    const button = page.getByRole("button");
    const display = page.locator("button > span");

    // The counter custom element gets its initial count of 2 from the page element
    await expect(button).toBeVisible();
    await expect(display).toContainText("2");

    // The button is functional: the hydration worked across multiple shadow roots like layout, page, counter
    await button.click();
    await expect(display).toContainText("3");
  });
});
