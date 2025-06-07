import { expect, type Page, test } from "playwright/test";

test.describe("r-switch", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const res =
      await (page.goto("http://localhost:1235/structural-elements/r-switch"));
    expect(res?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("fallback-only r-switch displays the fallback", async () => {
    const fallback = page
      .getByTestId("fallback-only")
      .locator("[slot=fallback]");

    await expect(fallback).toBeVisible();
  });

  test("only r-match children of fallback content can be visible", async () => {
    const testCase = page.getByTestId("r-match-only");
    const notVisible = testCase.locator("> div:not([slot=fallback])");
    const fallback = testCase.locator("[slot=fallback]");

    await expect(notVisible).toBeHidden();
    await expect(fallback).toBeVisible();
  });

  test("switches between matches and allows fallthrough", async () => {
    const checkbox1 = page.getByLabel("tab 1");
    const checkbox2 = page.getByLabel("tab 2");
    const checkbox3 = page.getByLabel("tab 3");

    // Checkbox 1 is checked
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).not.toBeChecked();
    await expect(checkbox3).not.toBeChecked();

    const testCase = page.getByTestId("switch-and-fallthrough");
    const match1 = testCase.locator("> r-match:nth-of-type(1)");
    const match2 = testCase.locator("> r-match:nth-of-type(2)");
    const match3 = testCase.locator("> r-match:nth-of-type(3)");
    const fallback = testCase.locator("[slot=fallback]");

    // Case 1 matches
    await expect(match1).toBeVisible();
    await expect(match2).toBeHidden();
    await expect(match3).toBeHidden();
    await expect(fallback).toBeHidden();

    // Fallback
    await checkbox1.click();
    await expect(match1).toBeHidden();
    await expect(match2).toBeHidden();
    await expect(match3).toBeHidden();
    await expect(fallback).toBeVisible();

    // Case 2 matches only
    await checkbox2.click();
    await expect(match1).toBeHidden();
    await expect(match2).toBeVisible();
    await expect(match3).toBeHidden();
    await expect(fallback).toBeHidden();

    // Fallthrough
    await checkbox3.click();
    await expect(match1).toBeHidden();
    await expect(match2).toBeVisible();
    await expect(match3).toBeVisible();
    await expect(fallback).toBeHidden();
  });

  test("exclusive options", async () => {
    const input = page.getByLabel("number");

    const testCase = page.getByTestId("exclusive");
    const isEvenLessThan10 = testCase.locator("> r-match:nth-of-type(1)");
    const isEvenBiggerThan10 = testCase.locator("> r-match:nth-of-type(2)");
    const isOdd = testCase.locator("> r-match:nth-of-type(3)");

    // even less than 10
    await expect(input).toHaveValue("0");
    await expect(isEvenLessThan10).toBeVisible();
    await expect(isEvenBiggerThan10).toBeHidden();
    await expect(isOdd).toBeHidden();

    // odd
    input.fill("1");
    await expect(isEvenLessThan10).toBeHidden();
    await expect(isEvenBiggerThan10).toBeHidden();
    await expect(isOdd).toBeVisible();

    // even bigger than 10
    input.fill("12");
    await expect(isEvenLessThan10).toBeHidden();
    await expect(isEvenBiggerThan10).toBeVisible();
    await expect(isOdd).toBeHidden();
  });
});
