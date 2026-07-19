import { test, expect, Page } from "@playwright/test";

// spec: guest-account-data-lifecycle（Issue #228）
// クライアント JS はテンプレートリテラル埋め込みのため、初期化フローの直列処理
// （認証確認 → マージ → クリア → サーバーから取得 → 上書き）はブラウザ実行でしか検証できない。
// ローカル E2E では shared_cache が未シードのため、マージ・ずかん取得 API はモックする
// （auth.spec.ts の generate モックと同じ理由）。

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("AC-001: ゲスト収集 → ログイン → リロード → 残存", async ({ page }) => {
  const errors = collectErrors(page);

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });

  let authed = false;
  let mergeRequestWords: string[] | null = null;

  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        authed
          ? { authed: true, id: "user-1", email: "guest@example.com", tickets: 50, image_style: "ehon" }
          : { authed: false }
      ),
    });
  });

  await page.route("**/api/auth/signup", (route) => {
    authed = true;
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "user-1", email: "guest@example.com", tickets: 50 }),
    });
  });

  await page.route("**/api/hakken/merge-guest-entries", (route) => {
    const body = route.request().postDataJSON() as { words: string[] };
    mergeRequestWords = body.words;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ merged: body.words }),
    });
  });

  await page.route("**/api/hakken/entries", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { word: "いぬ", description: "しっぽを ふって よろこぶよ。", image_url: "/images/cache/ehon_いぬ.webp" },
      ]),
    });
  });

  await page.goto("/");
  await expect(page.getByText("もじずかん")).toBeVisible();

  // ゲストとして「いぬ」を収集済みの状態を localStorage に注入してから読み込み直す
  // (addInitScript は毎回のナビゲーションで再実行されるため、意図的に一度きりの
  // evaluate + reload でゲスト状態を作る。こうすることで、後段のリロード確認が
  // 「localStorage が残っているから表示される」偽陽性にならず、サーバー永続化を検証できる)
  await page.evaluate(() => {
    localStorage.setItem('mojizukan_entries', JSON.stringify(['いぬ']));
    localStorage.setItem('mojizukan_hakken', JSON.stringify(['いぬ']));
  });
  await page.reload();
  await expect(page.getByText("もじずかん")).toBeVisible();

  // サインアップシートを開いてメールで登録
  await page.evaluate(() => { (window as any).__setState({ sheet: "signup", authMode: "choose" }); });
  await page.evaluate(() => { (window as any).__setAuthMode("email-signup"); });
  await page.locator("#auth-email").fill("guest@example.com");
  await page.locator("#auth-pass").fill("password123");
  await page.getByRole("button", { name: "とうろく" }).click();

  // マージAPIにゲスト収集語が渡される（AC-003 の許可リスト照合はサーバー側の単体/統合テストで検証済み）
  await expect.poll(() => mergeRequestWords).toEqual(["いぬ"]);

  await page.getByRole("button", { name: /ずかん/ }).click();
  await expect(page.getByText("1けん")).toBeVisible();
  await expect(page.getByRole("button", { name: "いぬ", exact: true })).toBeVisible();

  // リロードしても消えない（サーバーの hakken_entries から復元されるため。
  // localStorage は merge 後にクリア済みで「いぬ」は保持していない）
  await page.reload();
  await expect(page.getByText("もじずかん")).toBeVisible();
  await page.getByRole("button", { name: /ずかん/ }).click();
  await expect(page.getByText("1けん")).toBeVisible();
  await expect(page.getByRole("button", { name: "いぬ", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("AC-002: 認証中収集 → ログアウト → 消失", async ({ page }) => {
  const errors = collectErrors(page);

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
  await page.goto("/");
  await expect(page.getByText("もじずかん")).toBeVisible();

  // ログイン中に新しい語「かめ」を集めた状態を注入する。
  // 認証中は saveState が localStorage に書き込まないため、メモリ上の state のみで表現する
  await page.evaluate(() => {
    (window as any).__setState({ authed: true, userId: "user-1", tickets: 5, zukanWords: ["かめ"], hakkenWords: ["かめ"] });
  });

  await page.getByRole("button", { name: /ずかん/ }).click();
  await expect(page.getByText("1けん")).toBeVisible();
  await expect(page.getByRole("button", { name: "かめ", exact: true })).toBeVisible();

  // 保護者メニュー（ログアウトボタンの導線）に直接遷移（長押しゲートは auth.spec.ts で別途検証済み）
  await page.evaluate(() => { (window as any).__setState({ screen: "parent", sheet: null }); });
  await expect(page.getByText("学習の記録")).toBeVisible();
  await page.getByRole("button", { name: "ログアウト" }).click();

  // ハードリダイレクトで全クライアントステートが破棄され、ゲストの表示に「かめ」は含まれない
  await page.waitForURL("**/");
  await expect(page.getByText("もじずかん")).toBeVisible();
  await page.getByRole("button", { name: /ずかん/ }).click();
  await expect(page.getByText("0けん")).toBeVisible();
  await expect(page.getByRole("button", { name: "かめ", exact: true })).not.toBeVisible();

  expect(errors).toEqual([]);
});
