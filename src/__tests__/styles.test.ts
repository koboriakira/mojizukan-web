import { describe, it, expect } from "vitest";
import { globalStyles } from "../client/styles";

describe("globalStyles", () => {
  it("全 CSS カスタムプロパティが定義されている", () => {
    const vars = [
      "--bg",
      "--card",
      "--cbd",
      "--ink",
      "--sub",
      "--accent",
      "--accentd",
      "--accent2",
      "--accent2d",
      "--locked",
      "--fhead",
      "--rad",
    ];
    for (const v of vars) {
      expect(globalStyles).toContain(v);
    }
  });

  it("box-sizing: border-box がグローバル適用されている", () => {
    expect(globalStyles).toContain("box-sizing: border-box");
  });

  it("max-width: 560px の中央寄せレイアウトがある", () => {
    expect(globalStyles).toContain("max-width: 560px");
    expect(globalStyles).toContain("margin: 0 auto");
  });

  it("min-height: 100vh が設定されている", () => {
    expect(globalStyles).toContain("min-height: 100vh");
  });

  it("ボタンの 3D 押下効果が定義されている", () => {
    expect(globalStyles).toContain("box-shadow: 0 6px 0 var(--accentd)");
    expect(globalStyles).toContain("translateY(3px) scale(.98)");
  });

  it("アニメーション keyframes が定義されている", () => {
    expect(globalStyles).toContain("@keyframes pop");
    expect(globalStyles).toContain("@keyframes rise");
    expect(globalStyles).toContain("@keyframes sheetUp");
    expect(globalStyles).toContain("@keyframes fade");
  });
});
