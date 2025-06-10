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
    const button1 = page.getByTestId("counter1").locator("> button");
    const display1 = button1.locator("> span");

    // The counter custom element gets its initial count of 2 from the page element
    await expect(button1).toBeVisible();
    await expect(display1).toContainText("2");

    // The button is functional: the hydration worked across multiple shadow roots like layout, page, counter
    await button1.click();
    await expect(display1).toContainText("3");
  });

  test("siblings are hydrated too", async () => {
    const button2 = page.getByTestId("counter2").locator("> button");
    const display2 = button2.locator("> span");

    await expect(button2).toBeVisible();
    await expect(display2).toContainText("0");

    await button2.click();
    await expect(display2).toContainText("1");
  });
});
