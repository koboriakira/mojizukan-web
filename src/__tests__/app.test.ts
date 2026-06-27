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
    const screens = ["home", "write", "reveal", "zukan", "detail"];
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
    expect(clientApp).toContain("はじめる");
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

  it("グローバル関数が定義されている", () => {
    const funcs = ["__goHome", "__goWrite", "__goZukan", "__confirmChar", "__clearCanvas", "__undo"];
    for (const f of funcs) {
      expect(clientApp).toContain(`window.${f}`);
    }
  });

  it("PRESETS データが埋め込まれている", () => {
    expect(clientApp).toContain("var PRESETS");
    expect(clientApp).toContain("var WORDPOOL");
  });

  it("Canvas の重複リスナー防止フラグが存在する", () => {
    expect(clientApp).toContain("_canvasWired");
  });
});
