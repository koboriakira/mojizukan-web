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

test("ゲスト + みつける → おためしことば → キャッシュヒット → イラスト付き表示 (ADR-0003)", async ({
  page,
}) => {
  const errors = collectErrors(page);

  // generate API をモック: キャッシュヒット（ゲストでも200を返す）
  await page.route("**/api/hakken/generate", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        description: "しっぽを ふって よろこぶよ。おさんぽが だいすきなんだ。",
        image_url: "/api/images/hakken/cache/いぬ.webp",
        cached: true,
        rediscovery: false,
      }),
    });
  });

  // 画像リクエストもモック（R2 に実体がないため）
  await page.route("**/api/images/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "image/webp",
      body: Buffer.from("RIFF\x00\x00\x00\x00WEBP", "binary"),
    });
  });

  await page.goto("/");

  // ゲストがおためしことば「いぬ」をなぞり切るフローを注入
  await page.evaluate(() => {
    (window as any).__setState({
      authed: false,
      screen: "trace",
      word: "いぬ",
      charIndex: 0,
      confirmed: [],
      discovering: true,
      revealKind: "mitsuke",
      drew: false,
    });
  });

  await expect(page.locator("canvas")).toBeVisible();

  // 2文字分なぞり完了
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "できた！" }).click();

  // はっけん演出 → reveal 画面でイラスト付き表示
  await expect(page.getByText("みつけた！")).toBeVisible({ timeout: 10_000 });
  // イラストが表示されている（img タグが存在する）
  await expect(page.locator("img[src*='いぬ']")).toBeVisible();
  // 説明文が表示されている（STARTER_WORDS の desc が優先表示される）
  await expect(page.getByText("しっぽを ふって よろこぶよ")).toBeVisible();

  expect(errors).toEqual([]);
});
