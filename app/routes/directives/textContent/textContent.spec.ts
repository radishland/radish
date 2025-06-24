import { expect, type Page, test } from "playwright/test";

test.describe("textContent directive", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const res =
      await (page.goto("http://localhost:1235/directives/textContent"));
    expect(res?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("clicking the button toggles the textContent", async () => {
    const button = page.getByRole("button");
    const span = page.getByTestId("span");

    await expect(span).toHaveText("false");

    button.click();
    await expect(span).toHaveText("true");
  });
});
