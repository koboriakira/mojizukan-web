import { test, expect, BrowserContext } from "@playwright/test";

const TEST_EMAIL = "e2e-test@example.com";
const TEST_PASSWORD = "e2e-test-password-2026";

async function signup(
  context: BrowserContext,
  baseURL: string
): Promise<boolean> {
  const res = await context.request.post(`${baseURL}/api/auth/signup`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  return res.ok();
}

async function login(
  context: BrowserContext,
  baseURL: string
): Promise<boolean> {
  const res = await context.request.post(`${baseURL}/api/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  return res.ok();
}

test.describe("ステージング認証済みフロー", () => {
  let baseURL: string;

  test.beforeAll(async ({ browser }) => {
    baseURL =
      process.env.STAGING_URL ||
      "https://mojizukan-web.private-beats.workers.dev";
    const context = await browser.newContext();
    const signedUp = await signup(context, baseURL);
    if (!signedUp) {
      await login(context, baseURL);
    }
    await context.close();
  });

  test.beforeEach(async ({ context }) => {
    await login(context, baseURL);
  });

  test("認証状態でホーム → みつける → なぞり", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("もじずかん")).toBeVisible();

    const meRes = await page.request.get(`${baseURL}/api/auth/me`);
    expect(meRes.ok()).toBe(true);
    const me = await meRes.json();
    expect(me.id).toBeTruthy();

    await page.getByRole("button", { name: "みつける" }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
  });

  test("認証状態で保護者メニュー → はっけん準備", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: "おうちの ひとは こちら" })
      .click();
    await expect(page.getByText("ながおし で はいる")).toBeVisible();
    await page.evaluate(() => {
      (window as any).__setState({
        screen: "parent",
        sheet: null,
        authed: true,
        tickets: 5,
      });
    });
    await expect(page.getByText("がくしゅう きろく")).toBeVisible();

    await page.getByRole("button", { name: "ことばを 仕込む" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^はっけん準備$/ })
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("認証状態ではっけん生成（Workers AI）", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      (window as any).__setState({
        authed: true,
        tickets: 3,
        seeded: ["かめ"],
      });
    });
    await page.getByRole("button", { name: "ずかん" }).click();
    await expect(page.getByText("ひみつの ことば")).toBeVisible();
    await page.getByRole("button", { name: "?" }).first().click();
    await expect(page.locator("canvas")).toBeVisible();

    await page.evaluate(() => {
      (window as any).__setState({ drew: true });
    });
    await page.getByRole("button", { name: "なぞれたよ！" }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await page.evaluate(() => {
      (window as any).__setState({ drew: true });
    });
    await page.getByRole("button", { name: "できた！" }).click();

    // Reveal 画面のタイトル（みつけた！⭐）を確認
    await expect(page.getByText("みつけた！⭐")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("おはなしフロー: 語選択 → AI生成 → 絵本表示", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");

    await page.evaluate(() => {
      (window as any).__setState({
        authed: true,
        tickets: 5,
        collected: ["かめ", "いぬ", "ねこ"],
        discovered: { かめ: true, いぬ: true, ねこ: true },
      });
    });

    await page.getByRole("button", { name: "おはなし" }).click();
    await expect(
      page.getByRole("button", { name: /おはなしを つくる/ })
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /おはなしを つくる/ }).click();

    await expect(
      page.getByText("AIが おはなしを かいているよ")
    ).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("おはなし")).toBeVisible({ timeout: 60_000 });
  });

  test("新規登録 → ログイン → セッション確認", async ({ page, context }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@example.com`;
    const password = "e2e-signup-password-2026";

    const signupRes = await context.request.post(
      `${baseURL}/api/auth/signup`,
      { data: { email: uniqueEmail, password } }
    );
    expect(signupRes.ok()).toBe(true);

    const meRes = await page.request.get(`${baseURL}/api/auth/me`);
    expect(meRes.ok()).toBe(true);
    const me = await meRes.json();
    expect(me.id).toBeTruthy();

    await context.request.post(`${baseURL}/api/auth/logout`);

    const loginRes = await context.request.post(
      `${baseURL}/api/auth/login`,
      { data: { email: uniqueEmail, password } }
    );
    expect(loginRes.ok()).toBe(true);
  });

  test("ログアウト → セッション無効化", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      (window as any).__setState({
        screen: "parent",
        sheet: null,
        authed: true,
      });
    });
    await expect(page.getByText("がくしゅう きろく")).toBeVisible();

    await page.getByRole("button", { name: "ログアウト" }).click();

    // ログアウト後、セッションが無効化されたことを確認
    await page.waitForTimeout(500);
    const me = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me");
      return res.json();
    });
    expect(me.authed).toBe(false);
  });
});
