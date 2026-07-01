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

test("保護者ゲート → メニュー → はっけん準備 → 登録", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/");

  // ログイン済みユーザーとして保護者ゲートへ（ゲストのログインガードは auth.spec.ts で検証）
  // 保護者ゲート（長押し1.2sはE2Eでflaky → evaluateでバイパス）
  await page.evaluate(() => {
    (window as any).__setState({ authed: true, userId: "test-user", tickets: 5 });
  });
  await page
    .getByRole("button", { name: "おうちの ひとは こちら" })
    .click();
  await expect(page.getByText("長押しで入る")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__setState({ screen: "parent", sheet: null });
  });
  await expect(page.getByText("学習の記録")).toBeVisible();

  // ことばを準備するセクション
  await expect(page.getByText("ことばを 準備する")).toBeVisible();

  // 認証済みなので prep へ直接遷移
  await page.getByRole("button", { name: "ことばを 登録する" }).click();

  // prep 画面へ
  await expect(
    page.locator("div").filter({ hasText: /^はっけん準備$/ }).first()
  ).toBeVisible();
  await expect(page.getByText("🎟️ 5")).toBeVisible();

  // 手動入力で登録
  await page.locator("#prep-input").fill("らいおん");
  await page.getByRole("button", { name: "＋" }).click();
  await expect(page.getByText("発見OK").first()).toBeVisible();

  // 登録（prep 画面の「⭐ N こ 登録する」ボタン）
  await page.getByRole("button", { name: /個 登録する/ }).click();
  await expect(page.getByText("個 登録しますか？")).toBeVisible();

  // 確認して確定（prepconfirm シートの「⭐ 登録する」ボタン）
  await page.getByRole("button", { name: "⭐ 登録する" }).click();
  await expect(page.getByText("学習の記録")).toBeVisible();

  expect(errors).toEqual([]);
});

test("みつける → prepared 語が出題 → hakkengen 演出", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");

  // prepared 語の発見フローを直接注入（ランダム性を排除）
  await page.evaluate(() => {
    (window as any).__setState({
      authed: true,
      tickets: 3,
      prepared: ["かめ"],
      screen: "trace",
      word: "かめ",
      charIndex: 0,
      confirmed: [],
      discovering: true,
      revealKind: "mitsuke",
      drew: false,
    });
  });

  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("なぞって みよう！なにが でるかな？")).toBeVisible();

  // drew ゲートを解除して2文字分確定
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "できた！" }).click();

  // hakkengen → API フォールバック → Reveal
  await expect(page.getByText("みつけた！")).toBeVisible({
    timeout: 10_000,
  });

  expect(errors).toEqual([]);
});

test("たんけん → 辞書語を組み立て → なぞり → ずかん登録", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  // ログイン済みユーザーとしてたんけんへ（ゲストのログインガードは auth.spec.ts で検証）
  await page.evaluate(() => {
    (window as any).__setState({ authed: true, userId: "test-user" });
  });
  await page.getByRole("button", { name: "たんけんに でる" }).click();
  await expect(page.getByText("たんけん")).toBeVisible();

  // 再発見: zukanWords に「いぬ」が入っている状態で「いぬ」を組み立て → ブロックされず書く画面へ
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      tankenChars: ["い", "ぬ"],
      tankenMsg: null,
      zukanWords: ["いぬ"],
    });
  });
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.locator("canvas")).toBeVisible();

  // 再発見のなぞり完了 → reveal 画面で「もういちど はっけん しよう！」バナー表示
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "なぞれたよ！" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => { (window as any).__setState({ drew: true }); });
  await page.getByRole("button", { name: "できた！" }).click();
  await expect(page.getByText("もういちど はっけん しよう！")).toBeVisible();
  await expect(page.getByRole("button", { name: "たんけんに もどる" })).toBeVisible();

  // 辞書語の正常フロー: 「いぬ」を zukanWords から外して再挑戦
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "tanken",
      tankenChars: ["い", "ぬ"],
      tankenMsg: null,
      zukanWords: [],
    });
  });

  // CTA をクリック
  await page.getByRole("button", { name: /これを かく/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("「いぬ」を なぞろう")).toBeVisible();

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
