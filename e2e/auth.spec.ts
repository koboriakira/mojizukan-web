import { test, expect, Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// ADR-0003: AI生成（チケット消費）が発生しうる操作はログイン必須。
// たんけん・保護者メニューはゲスト（未ログイン）からのアクセス時、
// 各画面には遷移せずログイン誘導（signup シート）を表示する（Issue #194）。

test("ゲストがたんけんボタンを押すとログイン誘導が表示される", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page.getByText("もじずかん")).toBeVisible();

  await page.getByRole("button", { name: "たんけんに でる" }).click();

  // たんけん画面には遷移せず、ログイン誘導が表示される
  await expect(page.getByText("とうろくして つづきを あそぼう")).toBeVisible();
  // ホーム画面は裏側でそのまま維持される（screen は tanken に遷移していない）
  await expect(page.getByText("もじずかん")).toBeVisible();

  expect(errors).toEqual([]);
});

test("ゲストが保護者メニューを押すとログイン誘導が表示される", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");

  await page.getByRole("button", { name: "おうちの ひとは こちら" }).click();

  // 保護者ゲート（長押し）には遷移せず、ログイン誘導が表示される
  await expect(page.getByText("とうろくして つづきを あそぼう")).toBeVisible();
  await expect(page.getByText("長押しで入る")).not.toBeVisible();
  await expect(page.getByText("もじずかん")).toBeVisible();

  expect(errors).toEqual([]);
});
