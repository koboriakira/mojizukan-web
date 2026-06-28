import { test, expect } from "@playwright/test";

test("ページが JS エラーなしに読み込める", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.getByText("もじずかん")).toBeVisible();

  expect(errors).toEqual([]);
});

test("「はじめる」→ なぞり書き画面が表示される", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.getByText("はじめる").click();
  await expect(page.locator("canvas")).toBeVisible();

  expect(errors).toEqual([]);
});

test("「ずかんをみる」→ 図鑑画面が表示される", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.getByRole("button", { name: "ずかん" }).click();
  await expect(page.getByText("けん")).toBeVisible();

  expect(errors).toEqual([]);
});
