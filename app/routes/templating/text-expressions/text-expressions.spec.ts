import { expect, type Page, test } from "playwright/test";

test.describe("templating", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const res =
      await (page.goto("http://localhost:1235/templating/text-expressions"));
    expect(res?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("clicking the button update the text-expression", async () => {
    const button = page.getByRole("button");
    const pressed = page.getByTestId("pressed");

    await expect(pressed).toHaveText("Pressed (true/false): false");

    button.click();
    await expect(pressed).toHaveText("Pressed (true/false): true");

    button.click();
    await expect(pressed).toHaveText("Pressed (true/false): false");
  });

  test("updating the inputs changes the text-expression", async () => {
    const inputA = page.getByRole("spinbutton", { name: "a" });
    const inputB = page.getByRole("spinbutton", { name: "b" });
    const expression = page.getByTestId("expression");

    await expect(expression).toHaveText("1 + 2 = 3");

    await inputA.click();
    await inputA.press("ArrowUp");

    await inputB.click();
    await inputB.press("ArrowUp");

    // TODO: coerce input values (?)
    await expect(expression).toHaveText("2 + 3 = 5");
  });
});
