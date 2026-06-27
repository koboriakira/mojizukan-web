import { describe, it, expect } from "vitest";
import { buildShell } from "../client/shell";

describe("buildShell", () => {
  it("DOCTYPE を含む", () => {
    expect(buildShell()).toContain("<!DOCTYPE html>");
  });

  it("viewport meta が含まれる", () => {
    expect(buildShell()).toContain('name="viewport"');
  });

  it("Google Fonts が読み込まれる", () => {
    const html = buildShell();
    expect(html).toContain("Zen+Maru+Gothic");
    expect(html).toContain("Zen+Kaku+Gothic+New");
  });

  it("CSS カスタムプロパティが含まれる", () => {
    const html = buildShell();
    expect(html).toContain("--bg:");
    expect(html).toContain("--accent:");
    expect(html).toContain("--fhead:");
  });

  it("#app div が含まれる", () => {
    expect(buildShell()).toContain('<div id="app">');
  });

  it("<script> タグが含まれる", () => {
    expect(buildShell()).toContain("<script>");
  });

  it("lang=ja が設定されている", () => {
    expect(buildShell()).toContain('lang="ja"');
  });
});
