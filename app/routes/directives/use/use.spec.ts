import { expect, test } from "playwright/test";

test("use hook", async ({ page }) => {
  const res = await (page.goto("http://localhost:1235/directives/use"));
  expect(res?.status()).toBe(200);

  const button = page.getByRole("button");
  const count = page.getByTestId("count");

  // Content is initially visible
  await expect(count).toHaveText("0");

  // Clicking the checkbox toggles the content
  await button.click();
  await expect(count).toHaveText("1");
});
