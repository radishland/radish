import { expect, type Page, test } from "playwright/test";

test.describe("textContent directive", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const res = await (page.goto("http://localhost:1235/syntax/mustache"));
    expect(res?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("clicking the button toggles the textContent", async () => {
    const button = page.getByRole("button");
    const pressed = page.getByTestId("pressed");

    await expect(pressed).toHaveText("false");

    button.click();
    await expect(pressed).toHaveText("true");

    button.click();
    await expect(pressed).toHaveText("false");
  });
});
