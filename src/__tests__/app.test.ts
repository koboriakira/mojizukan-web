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
});
