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
    const screens = ["home", "trace", "reveal", "zukan", "detail", "mitsukeru"];
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
    expect(clientApp).toContain("STARTER_WORDS[word]");
    expect(clientApp).toContain("ずかんに のったよ");
  });

  it("revealKind state が定義されている", () => {
    expect(clientApp).toContain("revealKind:");
  });

  it("revealKind によるリビールタイトル分岐がある", () => {
    expect(clientApp).toContain("s.revealKind");
    expect(clientApp).toContain("みつけた！");
  });

  it("復習モード (revealKind='review') のタイトルとバナーがある", () => {
    expect(clientApp).toContain("また かけたね");
    expect(clientApp).toContain("もういちど はっけん しよう！");
  });

  it("goMitsukeru が pool=0 & collected あり で復習モードに遷移する", () => {
    expect(clientApp).toContain("'review'");
    expect(clientApp).toContain("reviewPick");
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
    expect(clientApp).toContain("limitWord:");
  });

  it("グローバル関数が定義されている", () => {
    const funcs = ["__goHome", "__goWrite", "__goZukan", "__confirmChar", "__clearCanvas", "__undo", "__goMitsukeru", "__goTanken", "__goWriteWord"];
    for (const f of funcs) {
      expect(clientApp).toContain(`window.${f}`);
    }
  });

  it("STARTER_WORDS データが埋め込まれている", () => {
    expect(clientApp).toContain("var STARTER_WORDS");
  });

  it("Canvas の重複リスナー防止フラグが存在する", () => {
    expect(clientApp).toContain("_canvasWired");
  });

  it("図鑑画面がグリッドレイアウトを含む", () => {
    expect(clientApp).toContain("grid-template-columns");
  });

  it("図鑑画面が戻るボタンを含む", () => {
    expect(clientApp).toContain("window.__goHome()");
    expect(clientApp).toContain("けん</span>");
  });

  it("詳細画面が PRESETS データ参照を含む", () => {
    expect(clientApp).toContain("s.detailWord");
    expect(clientApp).toContain("preset.desc");
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

  it("setupCanvas がオフスクリーン Canvas（ink, mask）を使用する", () => {
    expect(clientApp).toContain("_ink");
    expect(clientApp).toContain("_mask");
    expect(clientApp).toContain("buildMask");
    expect(clientApp).toContain("renderTrace");
  });

  it("キラキラ粒子（spark）が実装されている", () => {
    expect(clientApp).toContain("function spark");
    expect(clientApp).toContain("starPath");
    expect(clientApp).toContain("#ffd24a");
  });

  it("チャイム音（twinkle）が実装されている", () => {
    expect(clientApp).toContain("function twinkle");
    expect(clientApp).toContain("AudioContext");
    expect(clientApp).toContain("523.25");
  });

  it("手書きキャプチャが ink Canvas から取得される", () => {
    expect(clientApp).toContain("_ink.toDataURL");
  });

  it("音声読み上げ（speakText）が実装されている", () => {
    expect(clientApp).toContain("function speakText");
    expect(clientApp).toContain("SpeechSynthesisUtterance");
    expect(clientApp).toContain("lang = 'ja-JP'");
  });

  it("speak 設定トグルが保護者メニューに含まれる", () => {
    expect(clientApp).toContain("__toggleSpeak");
    expect(clientApp).toContain("読み上げ");
  });

  it("setState で saveState が呼ばれる", () => {
    expect(clientApp).toContain("saveState()");
    const setStateIdx = clientApp.indexOf("function setState");
    const saveStateIdx = clientApp.indexOf("saveState()", setStateIdx);
    expect(saveStateIdx).toBeGreaterThan(setStateIdx);
  });

  it("loadState で初期 state が設定される", () => {
    expect(clientApp).toContain("var saved = loadState()");
    expect(clientApp).toContain("saved.zukanWords ||");
    expect(clientApp).toContain("saved.hakkenWords ||");
    expect(clientApp).toContain("saved.handwriting ||");
  });

  it("ゲストモードでは D1 POST をスキップする", () => {
    expect(clientApp).toContain("if (state.authed)");
  });

  it("サインアップシート (sheet === 'signup') に認証フォームが含まれる", () => {
    expect(clientApp).toContain("s.sheet === 'signup'");
    expect(clientApp).toContain("メールで はじめる");
    expect(clientApp).toContain("Google で ログイン");
    expect(clientApp).toContain("auth-email");
    expect(clientApp).toContain("auth-pass");
  });

  it("認証関連グローバル関数が定義されている", () => {
    expect(clientApp).toContain("window.__submitAuth");
    expect(clientApp).toContain("window.__googleLogin");
    expect(clientApp).toContain("window.__setAuthMode");
    expect(clientApp).toContain("window.__logout");
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
    expect(clientApp).toContain("長押しで入る");
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

  it("絵本ビュー画面のレンダリングロジックが含まれる", () => {
    expect(clientApp).toContain("function renderStory");
    expect(clientApp).toContain("storyPages");
    expect(clientApp).toContain("storyPage");
  });

  it("絵本のローディング表示が含まれる", () => {
    expect(clientApp).toContain("AIが おはなしを かいているよ");
    expect(clientApp).toContain("dotpulse");
  });

  it("絵本ページのトークン描画ロジックが含まれる", () => {
    expect(clientApp).toContain("tok.t === 'word'");
    expect(clientApp).toContain("tok.w");
    expect(clientApp).toContain("tok.s");
  });

  it("手書き差し替えロジックが含まれる", () => {
    expect(clientApp).toContain("s.handwriting && s.handwriting[tok.w]");
  });

  it("ページめくり操作関数が定義されている", () => {
    expect(clientApp).toContain("window.__storyPrev");
    expect(clientApp).toContain("window.__storyNext");
    expect(clientApp).toContain("window.__storyRestart");
  });

  it("goStory が API を呼び出す", () => {
    expect(clientApp).toContain("fetch('/api/story/stream'");
    expect(clientApp).toContain("storyLoading: true");
  });

  it("最終ページに もういちど と できた ボタンがある", () => {
    expect(clientApp).toContain("もういちど");
    expect(clientApp).toContain("できた！");
  });
});
