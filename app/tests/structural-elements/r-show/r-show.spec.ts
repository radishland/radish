import { expect, test } from "playwright/test";

test("r-show toggles its content", async ({ page }) => {
  const res =
    await (page.goto("http://localhost:1235/structural-elements/r-show"));
  expect(res?.status()).toBe(200);

  const checkbox = page.getByRole("checkbox");

  // Content is initially visible
  await expect(checkbox).toBeChecked();
  await expect(page.getByTestId("content")).toBeVisible();
  await expect(page.getByTestId("fallback")).toBeHidden();

  // Clicking the checkbox toggles the content
  await checkbox.click();
  await expect(page.getByTestId("content")).toBeHidden();
  await expect(page.getByTestId("fallback")).toBeVisible();
});
