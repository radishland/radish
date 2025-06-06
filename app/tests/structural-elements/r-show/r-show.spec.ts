import { expect, test } from "playwright/test";

test("r-show toggles its content", async ({ page }) => {
  const res =
    await (page.goto("http://localhost:1235/structural-elements/show"));
  expect(res?.status()).toBe(200);

  const checkbox = page.getByRole("checkbox");

  // Content is initially visible
  await expect(checkbox).toBeChecked();
  await expect(page.getByTestId("content")).toBeVisible();

  // Clicking the checkbox toggles the showed content
  await checkbox.click();
  await expect(page.getByTestId("visible")).toBeHidden();
});
