import { test, expect, Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("書く → 図鑑登録 → 詳細表示", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page.getByText("もじずかん")).toBeVisible();

  // みつける → 即時遷移で write 画面へ（Issue #62）
  await page.getByRole("button", { name: "みつける" }).click();
  await expect(page.locator("canvas")).toBeVisible();

  // 決定論的テストのため「て」（1文字）に切り替え
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "write",
      word: "て",
      charIndex: 0,
      confirmed: [],
      discovering: false,
      revealKind: "mitsuke",
    });
  });
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.getByText("ずかんに のったよ！")).toBeVisible();

  await page.getByRole("button", { name: "ずかんを みる" }).click();
  await expect(page.getByText("ずかん")).toBeVisible();
  await expect(page.getByText("1けん")).toBeVisible();

  // 収集済みの語をタップ → 詳細
  await page.getByRole("button", { name: "✋ て" }).click();
  await expect(page.getByText("✋")).toBeVisible();
  await expect(
    page.locator("div").filter({ hasText: /^て$/ }).first()
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("保護者ゲート → メニュー → はっけん準備 → 仕込み", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/");

  // 保護者ゲート（長押し1.2sはE2Eでflaky → evaluateでバイパス）
  await page
    .getByRole("button", { name: "おうちの ひとは こちら" })
    .click();
  await expect(page.getByText("ながおし で はいる")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__setState({ screen: "parent", sheet: null });
  });
  await expect(page.getByText("がくしゅう きろく")).toBeVisible();

  // みつける・たんけんカード
  await expect(page.getByText("みつける と たんけん")).toBeVisible();
  await expect(page.getByText("たんけん の 1にち かいすう")).toBeVisible();

  // 未登録 → signup シート
  await page.getByRole("button", { name: "ことばを 仕込む" }).click();
  await expect(page.getByText("じぶんの 図鑑を とっておこう")).toBeVisible();

  // 登録をモック（実際のAPI呼び出しはE2Eの範囲外）
  await page.evaluate(() => {
    (window as any).__setState({
      authed: true,
      userId: "test-user",
      tickets: 5,
      sheet: null,
    });
  });
  await expect(page.getByText("がくしゅう きろく")).toBeVisible();

  // 登録済みなので今度は prep へ遷移
  await page.getByRole("button", { name: "ことばを 仕込む" }).click();

  // prep 画面へ
  await expect(
    page.locator("div").filter({ hasText: /^はっけん準備$/ }).first()
  ).toBeVisible();
  await expect(page.getByText("🎟️ 5")).toBeVisible();

  // ランダム候補
  await page
    .getByRole("button", { name: "ランダム候補を 3つ だす" })
    .click();
  await expect(page.getByText("はっけんOK").first()).toBeVisible();

  // 仕込み（prep 画面の「⭐ N こ 仕込む」ボタン）
  await page.getByRole("button", { name: /こ 仕込む/ }).click();
  await expect(page.getByText("こ 仕込む？")).toBeVisible();

  // 確認して確定（prepconfirm シートの「⭐ 仕込む」ボタン）
  await page.getByRole("button", { name: "⭐ 仕込む" }).click();
  await expect(page.getByText("がくしゅう きろく")).toBeVisible();

  expect(errors).toEqual([]);
});

test("ひみつのことば → 発見モード → hakkengen 演出", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");

  // seeded 状態を注入（「かめ」= 2文字で短い）
  await page.evaluate(() => {
    (window as any).__setState({
      authed: true,
      tickets: 3,
      seeded: ["かめ"],
    });
  });

  // ずかんへ（ホーム画面のボタンは「📖 ずかん」）
  await page.getByRole("button", { name: "ずかん" }).click();
  await expect(page.getByText("ひみつの ことば")).toBeVisible();

  // ? マスをタップ → 発見モードで書く画面
  await page.getByRole("button", { name: "?" }).first().click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("「かめ」を なぞろう")).toBeVisible();

  // 2文字分「なぞれたよ！」
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "なぞれたよ！" }).click();

  // hakkengen → API フォールバック → Reveal
  // requireAuth で 401 が即座に返るため、ローディング画面は一瞬で通過する
  await expect(page.getByText("みつけた！")).toBeVisible({
    timeout: 10_000,
  });

  expect(errors).toEqual([]);
});

test("たんけん → 辞書語を組み立て → なぞり → ずかん登録", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  await page.getByRole("button", { name: "たんけんに でる" }).click();
  await expect(page.getByText("たんけん")).toBeVisible();

  // 「て」を入力（辞書語・1文字なので2文字以上必要 → 一旦「て」+「ー」で伸ばす）
  // PRESETS に「て」があるので辞書語として扱われる
  // 代わりに「うし」を組み立てる（PRESETS に存在する辞書語）
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      tankenChars: ["う", "し"],
      tankenMsg: null,
    });
  });

  // CTA をクリック
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("「うし」を なぞろう")).toBeVisible();

  // 2文字分「なぞれたよ！」
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "なぞれたよ！" }).click();

  // 辞書語なので即 reveal（はっけんではない）
  await expect(page.getByText("ずかんに のったよ！")).toBeVisible();

  expect(errors).toEqual([]);
});
