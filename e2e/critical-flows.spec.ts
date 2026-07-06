import { test, expect, Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("書く → 図鑑登録 → 詳細表示", async ({ page }) => {
  const errors = collectErrors(page);

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
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

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
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

  // ローカル E2E ではセッション Cookie を持たないため、実際の /api/hakken/generate は
  // 401 を返す（Issue #193 でゲスト 401 フォールバックを廃止したため、モックせずに
  // 呼ぶとエラー画面に遷移してしまう）。ログイン済みユーザーの生成成功パスを
  // 決定論的に検証するため、レスポンスをモックする。
  await page.route("**/api/hakken/generate", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        description: "みずべに くらす かめだよ。こうらが かたいんだ。",
        image_url: "/images/mock-kame.webp",
        cached: false,
        rediscovery: false,
      }),
    });
  });

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
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

  // hakkengen → generate API（モック） → Reveal
  await expect(page.getByText("みつけた！")).toBeVisible({
    timeout: 10_000,
  });

  expect(errors).toEqual([]);
});

test("みつける → ゲストの generate 401 はフォールバックせずエラー画面へ (Issue #193)", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
  await page.goto("/");

  // ゲスト（authed:false, セッション Cookie なし）が mitsuke 語をなぞり切ると
  // discovering:true になり実際に /api/hakken/generate を呼ぶ。ローカルサーバーは
  // セッションを持たないため 401 を返す。以前はここで image_url:null の即席
  // オブジェクトにフォールバックしていたが、Issue #193 で廃止しエラー画面に
  // 遷移するようになった。
  await page.evaluate(() => {
    (window as any).__setState({
      authed: false,
      screen: "trace",
      word: "て",
      charIndex: 0,
      confirmed: [],
      discovering: true,
      revealKind: "mitsuke",
      drew: true,
    });
  });

  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();

  await expect(page.getByText("つくれなかったよ")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole("button", { name: "もう いちど" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ホームに もどる" })
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("たんけん → 辞書語を組み立て → なぞり → ずかん登録", async ({ page }) => {
  const errors = collectErrors(page);

  await page.addInitScript(() => { localStorage.setItem('mojizukan_onboarded', '1'); });
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

test("初回アクセス → オンボーディングLP → スキップ → ホーム → 2回目は直接ホーム", async ({ page }) => {
  const errors = collectErrors(page);

  // onboarded フラグなしで初回アクセス → オンボーディングLP
  await page.goto("/");
  await expect(page.getByText("3〜6さい向け もじあそびアプリ")).toBeVisible();
  await expect(page.getByText("どんな アプリ？")).toBeVisible();
  await expect(page.getByText("まなびの ねらい")).toBeVisible();
  await expect(page.getByText("おうちの方へ")).toBeVisible();
  await expect(page.getByRole("button", { name: "まず おうちの方が ためす" })).toBeVisible();
  await expect(page.getByRole("button", { name: "あとで →" })).toBeVisible();

  // 「あとで」スキップ → ホーム画面に遷移 + onboarded フラグが保存される
  await page.getByRole("button", { name: "あとで →" }).click();
  await expect(page.getByText("もじずかん")).toBeVisible();
  await expect(page.getByRole("button", { name: "みつける" })).toBeVisible();

  // 2回目のアクセス → LP をスキップして直接ホーム
  await page.reload();
  await expect(page.getByText("もじずかん")).toBeVisible();
  await expect(page.getByRole("button", { name: "みつける" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("オンボーディング → ためす → なぞり体験 → 受け渡し画面 → ホーム", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page.getByText("3〜6さい向け もじあそびアプリ")).toBeVisible();

  // 「ためす」→ みつけるフローに入る（previewMode: true）
  await page.getByRole("button", { name: "まず おうちの方が ためす" }).click();

  // trace 画面が表示される（みつけるフローで STARTER_WORDS から出題）
  await expect(page.locator("canvas")).toBeVisible();

  // 決定論的テストのため1文字語に切り替え + previewMode 維持
  await page.evaluate(() => {
    (window as any).__setState({
      screen: "trace",
      word: "て",
      charIndex: 0,
      confirmed: [],
      discovering: false,
      revealKind: "mitsuke",
      drew: true,
      previewMode: true,
    });
  });

  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();

  // reveal 画面で previewMode の「たいけん おわり」ボタンが表示
  await expect(page.getByText("ずかんに のったよ！")).toBeVisible();
  await expect(page.getByRole("button", { name: "たいけん おわり" })).toBeVisible();

  // 「たいけん おわり」→ 受け渡し画面
  await page.getByRole("button", { name: "たいけん おわり" }).click();
  await expect(page.getByText("たいけん かんりょう！")).toBeVisible();
  await expect(page.getByRole("button", { name: "お子さまに わたす" })).toBeVisible();

  // 「お子さまに わたす」→ ホームに遷移 + onboarded フラグ保存
  await page.getByRole("button", { name: "お子さまに わたす" }).click();
  await expect(page.getByText("もじずかん")).toBeVisible();
  await expect(page.getByRole("button", { name: "みつける" })).toBeVisible();

  // リロード → 直接ホーム（LP スキップ）
  await page.reload();
  await expect(page.getByText("もじずかん")).toBeVisible();
  await expect(page.getByRole("button", { name: "みつける" })).toBeVisible();

  expect(errors).toEqual([]);
});
