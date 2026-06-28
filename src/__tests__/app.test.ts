import { describe, it, expect } from "vitest";
import { clientApp } from "../client/app";

describe("clientApp", () => {
  it("screen state が定義されている", () => {
    expect(clientApp).toContain("screen:");
    expect(clientApp).toContain("'home'");
  });

  it("setState 関数が定義されている", () => {
    expect(clientApp).toContain("setState");
  });

  it("render 関数が定義されている", () => {
    expect(clientApp).toContain("function render");
  });

  it("全画面の switch case が含まれる", () => {
    const screens = ["home", "write", "reveal", "zukan", "detail", "mitsukeru"];
    for (const s of screens) {
      expect(clientApp).toContain(`case '${s}'`);
    }
  });

  it("sheet state が定義されている", () => {
    expect(clientApp).toContain("sheet:");
    expect(clientApp).toContain("signup");
    expect(clientApp).toContain("tickets");
  });

  it("history.pushState を使っていない（戻るボタン無効化）", () => {
    expect(clientApp).not.toContain("pushState");
  });

  it("ホーム画面がタイトルとボタンを含む", () => {
    expect(clientApp).toContain("もじずかん");
    expect(clientApp).toContain("みつける");
    expect(clientApp).toContain("たんけんに でる");
    expect(clientApp).toContain("ずかん");
  });

  it("キャンバス画面が trace-canvas を含む", () => {
    expect(clientApp).toContain("trace-canvas");
    expect(clientApp).toContain("なぞれたよ");
  });

  it("Reveal 画面がプリセットデータ参照を含む", () => {
    expect(clientApp).toContain("PRESETS[word]");
    expect(clientApp).toContain("ずかんに のったよ");
  });

  it("revealKind state が定義されている", () => {
    expect(clientApp).toContain("revealKind:");
  });

  it("revealKind によるリビールタイトル分岐がある", () => {
    expect(clientApp).toContain("s.revealKind");
    expect(clientApp).toContain("みつけた！");
  });

  it("みつける画面が完了通知として表示される", () => {
    expect(clientApp).toContain("renderMitsukeru");
    expect(clientApp).toContain("ぜんぶ みつけたよ");
    expect(clientApp).toContain("おうちの ひとに みせる");
  });

  it("mitsukePool 関数が定義されている", () => {
    expect(clientApp).toContain("function mitsukePool");
  });

  it("goMitsukeru が即時遷移ロジックを持つ", () => {
    expect(clientApp).toContain("mitsukePool(state)");
    expect(clientApp).toContain("__openSecret(pick)");
    expect(clientApp).toContain("__goWriteWord(pick");
  });

  it("たんけん画面の switch case が含まれる", () => {
    expect(clientApp).toContain("case 'tanken'");
    expect(clientApp).toContain("renderTanken");
  });

  it("50音データが埋め込まれている", () => {
    expect(clientApp).toContain("var ROWS");
    expect(clientApp).toContain("var DAKU");
    expect(clientApp).toContain("var HANDAKU");
    expect(clientApp).toContain("var SMALL");
  });

  it("たんけん操作関数が定義されている", () => {
    const funcs = ["__tkAdd", "__tkBack", "__tkClearAll", "__tkDaku", "__tkHandaku", "__tkSmall", "__tkChouon", "__tkNext"];
    for (const f of funcs) {
      expect(clientApp).toContain(`window.${f}`);
    }
  });

  it("classifyTanken 関数が定義されている", () => {
    expect(clientApp).toContain("classifyTanken");
  });

  it("tankenChars state が定義されている", () => {
    expect(clientApp).toContain("tankenChars:");
    expect(clientApp).toContain("tankenMsg:");
    expect(clientApp).toContain("tankenMode:");
  });

  it("tankenlimit 画面の switch case が含まれる", () => {
    expect(clientApp).toContain("case 'tankenlimit'");
    expect(clientApp).toContain("renderTankenlimit");
    expect(clientApp).toContain("きょうの たんけんは おしまい");
  });

  it("日次制限 state が定義されている", () => {
    expect(clientApp).toContain("dailyHakkenMax:");
    expect(clientApp).toContain("dailyHakkenUsed:");
    expect(clientApp).toContain("limitWord:");
  });

  it("日次制限の localStorage キーが定義されている", () => {
    expect(clientApp).toContain("mojizukan_hakken_max");
    expect(clientApp).toContain("mojizukan_hakken_used");
    expect(clientApp).toContain("mojizukan_hakken_date");
  });

  it("グローバル関数が定義されている", () => {
    const funcs = ["__goHome", "__goWrite", "__goZukan", "__confirmChar", "__clearCanvas", "__undo", "__goMitsukeru", "__goTanken", "__goWriteWord", "__incDaily", "__decDaily"];
    for (const f of funcs) {
      expect(clientApp).toContain(`window.${f}`);
    }
  });

  it("保護者メニューにたんけん設定カードが含まれる", () => {
    expect(clientApp).toContain("たんけん の 1にち かいすう");
  });

  it("PRESETS データが埋め込まれている", () => {
    expect(clientApp).toContain("var PRESETS");
    expect(clientApp).toContain("var WORDPOOL");
  });

  it("Canvas の重複リスナー防止フラグが存在する", () => {
    expect(clientApp).toContain("_canvasWired");
  });

  it("図鑑画面が CATEGORIES グリッドを含む", () => {
    expect(clientApp).toContain("CATEGORIES");
    expect(clientApp).toContain("grid-template-columns");
  });

  it("図鑑画面が戻るボタンを含む", () => {
    expect(clientApp).toContain("window.__goHome()");
    expect(clientApp).toContain("けん</span>");
  });

  it("詳細画面が PRESETS データ参照を含む", () => {
    expect(clientApp).toContain("s.detailWord");
    expect(clientApp).toContain("preset.emoji");
  });

  it("__openDetail グローバル関数が定義されている", () => {
    expect(clientApp).toContain("window.__openDetail");
  });

  it("localStorage ヘルパー関数が定義されている", () => {
    expect(clientApp).toContain("storageAvailable");
    expect(clientApp).toContain("saveState");
    expect(clientApp).toContain("loadState");
  });

  it("mojizukan_entries キーが定義されている", () => {
    expect(clientApp).toContain("mojizukan_entries");
  });

  it("mojizukan_discovered キーが定義されている", () => {
    expect(clientApp).toContain("mojizukan_discovered");
  });

  it("mojizukan_handwriting キーが localStorage に保存される", () => {
    expect(clientApp).toContain("mojizukan_handwriting");
  });

  it("handwriting state が初期値として定義されている", () => {
    expect(clientApp).toContain("handwriting:");
    expect(clientApp).toContain("saved.handwriting ||");
  });

  it("文字確定時に toDataURL で PNG をキャプチャする", () => {
    expect(clientApp).toContain("toDataURL('image/png')");
  });

  it("文字確定時に handwriting[word] に画像を追加する", () => {
    expect(clientApp).toContain("hw[word] = (hw[word] || []).concat([dataURL])");
  });

  it("undo 時に handwriting の末尾画像を破棄する", () => {
    expect(clientApp).toContain("hw[word] = hw[word].slice(0, -1)");
  });

  it("setupCanvas が DPR に合わせて内部解像度を設定する", () => {
    expect(clientApp).toContain("devicePixelRatio");
    expect(clientApp).toContain("ctx.scale(dpr, dpr)");
  });

  it("setState で saveState が呼ばれる", () => {
    expect(clientApp).toContain("saveState()");
    const setStateIdx = clientApp.indexOf("function setState");
    const saveStateIdx = clientApp.indexOf("saveState()", setStateIdx);
    expect(saveStateIdx).toBeGreaterThan(setStateIdx);
  });

  it("loadState で初期 state が設定される", () => {
    expect(clientApp).toContain("var saved = loadState()");
    expect(clientApp).toContain("saved.collected ||");
    expect(clientApp).toContain("saved.discovered ||");
    expect(clientApp).toContain("saved.handwriting ||");
  });

  it("ゲストモードでは D1 POST をスキップする", () => {
    expect(clientApp).toContain("if (state.authed)");
  });

  it("ヒントシート (sheet === 'hint') の表示ロジックが含まれる", () => {
    expect(clientApp).toContain("s.sheet === 'hint'");
    expect(clientApp).toContain("hintWord");
    expect(clientApp).toContain("わかった！");
  });

  it("__showHint グローバル関数が定義されている", () => {
    expect(clientApp).toContain("window.__showHint");
  });

  it("サインアップシート (sheet === 'signup') に登録ボタンが含まれる", () => {
    expect(clientApp).toContain("s.sheet === 'signup'");
    expect(clientApp).toContain("__doSignup()");
    expect(clientApp).toContain("メールで はじめる");
  });

  it("__doSignup グローバル関数が定義されている", () => {
    expect(clientApp).toContain("window.__doSignup");
  });

  it("_lastPromptCount パターンが含まれる", () => {
    expect(clientApp).toContain("_lastPromptCount");
  });

  it("ゲストバナーが含まれる", () => {
    expect(clientApp).toContain("いまは ゲスト");
    expect(clientApp).toContain("window.__showSignup()");
  });

  it("playSound 関数が定義されている", () => {
    expect(clientApp).toContain("function playSound");
  });

  it("_audioEnabled フラグが定義されている", () => {
    expect(clientApp).toContain("_audioEnabled");
  });

  it("autoplay policy 対応の pointerdown リスナーが含まれる", () => {
    expect(clientApp).toContain("pointerdown");
    expect(clientApp).toContain("_audioEnabled = true");
    expect(clientApp).toContain("{ once: true }");
  });

  it("効果音の呼び出しが含まれる", () => {
    expect(clientApp).toContain("playSound('tap')");
    expect(clientApp).toContain("playSound('confirm')");
    expect(clientApp).toContain("playSound('success')");
    expect(clientApp).toContain("playSound('cancel')");
  });

  it("保護者ゲートボタンがホーム画面に含まれる", () => {
    expect(clientApp).toContain("window.__showParentGate()");
    expect(clientApp).toContain("おうちの ひとは こちら");
  });

  it("保護者ゲートシートのレンダリングロジックが含まれる", () => {
    expect(clientApp).toContain("s.sheet === 'parentGate'");
    expect(clientApp).toContain("ながおし で はいる");
    expect(clientApp).toContain("pg-bar");
  });

  it("保護者ゲートの長押しハンドラが定義されている", () => {
    expect(clientApp).toContain("window.__pgDown");
    expect(clientApp).toContain("window.__pgUp");
    expect(clientApp).toContain("window.__showParentGate");
  });

  it("長押し 1.2 秒のタイマーが設定されている", () => {
    expect(clientApp).toContain("1200");
    expect(clientApp).toContain("requestAnimationFrame");
  });
});
