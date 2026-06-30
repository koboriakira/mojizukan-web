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

  // みつける → 即時遷移で trace 画面へ（Issue #62）
  await page.getByRole("button", { name: "みつける" }).click();
  await expect(page.locator("canvas")).toBeVisible();

  // 決定論的テストのため「て」（1文字）に切り替え
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "trace",
      word: "て",
      charIndex: 0,
      confirmed: [],
      discovering: false,
      revealKind: "mitsuke",
      drew: true,
    });
  });
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect(page.getByText("ずかんに のったよ！")).toBeVisible();

  await page.getByRole("button", { name: "ずかんを みる" }).click();
  await expect(page.getByText("ずかん")).toBeVisible();
  await expect(page.getByText("1けん")).toBeVisible();

  // 収集済みの語をタップ → 詳細
  await page.getByRole("button", { name: "て", exact: true }).click();
  await expect(
    page.locator("div").filter({ hasText: /^て$/ }).first()
  ).toBeVisible();

  // ゲスト状態でたんけん → 辞書にない新語を組み立て → 認証ゲート（登録シート）
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      authed: false,
      tankenChars: ["ぷ", "る"],
      tankenMsg: null,
      hakkenWords: Array.from({ length: 10 }, (_, i) => `word${i}`),
    });
  });
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.getByText("とうろくして つづきを あそぼう")).toBeVisible();

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
  await expect(page.getByText("長押しで入る")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__setState({ screen: "parent", sheet: null });
  });
  await expect(page.getByText("学習の記録")).toBeVisible();

  // みつける・たんけんカード
  await expect(page.getByText("みつける と たんけん")).toBeVisible();
  await expect(page.getByText("たんけんの1日の回数")).toBeVisible();

  // 未登録 → signup シート
  await page.getByRole("button", { name: "言葉を仕込む" }).click();
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
  await expect(page.getByText("学習の記録")).toBeVisible();

  // 登録済みなので今度は prep へ遷移
  await page.getByRole("button", { name: "言葉を仕込む" }).click();

  // prep 画面へ
  await expect(
    page.locator("div").filter({ hasText: /^はっけん準備$/ }).first()
  ).toBeVisible();
  await expect(page.getByText("🎟️ 5")).toBeVisible();

  // ランダム候補
  await page
    .getByRole("button", { name: "ランダム候補を3つ出す" })
    .click();
  await expect(page.getByText("発見OK").first()).toBeVisible();

  // 仕込み（prep 画面の「⭐ N こ 仕込む」ボタン）
  await page.getByRole("button", { name: /個 仕込む/ }).click();
  await expect(page.getByText("個 仕込みますか？")).toBeVisible();

  // 確認して確定（prepconfirm シートの「⭐ 仕込む」ボタン）
  await page.getByRole("button", { name: "⭐ 仕込む" }).click();
  await expect(page.getByText("学習の記録")).toBeVisible();

  expect(errors).toEqual([]);
});

test("ひみつのことば → 発見モード → hakkengen 演出", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");

  // prepared 状態を注入（「かめ」= 2文字で短い）
  await page.evaluate(() => {
    (window as any).__setState({
      authed: true,
      tickets: 3,
      prepared: ["かめ"],
    });
  });

  // ずかんへ（ホーム画面のボタンは「📖 ずかん」）
  await page.getByRole("button", { name: "ずかん" }).click();
  await expect(page.getByText("ひみつの ことば")).toBeVisible();

  // ? マスをタップ → 発見モードで書く画面（語は伏せられる）
  await page.getByRole("button", { name: "?" }).first().click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("なぞって みよう！なにが でるかな？")).toBeVisible();

  // drew ゲートを解除して2文字分確定
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "できた！" }).click();

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

  // 重複チェック: zukanWords に「うし」が入っている状態で「うし」を組み立て
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      tankenChars: ["う", "し"],
      tankenMsg: null,
      zukanWords: ["うし"],
    });
  });
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.getByText("もう ずかんに あるよ")).toBeVisible();

  // 辞書語の正常フロー: 「うし」を zukanWords から外して再挑戦
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      tankenChars: ["う", "し"],
      tankenMsg: null,
      zukanWords: [],
    });
  });

  // CTA をクリック
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("「うし」を なぞろう")).toBeVisible();

  // drew ゲートを解除して2文字分確定
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "できた！" }).click();

  // 辞書語なので即 reveal（はっけんではない）
  await expect(page.getByText("ずかんに のったよ！")).toBeVisible();

  expect(errors).toEqual([]);
});
