import { describe, it, expect } from "vitest";
import { buildImagePrompt, buildR2Key } from "../lib/image";

describe("みつける・たんけんの画像生成", () => {
  describe("buildImagePrompt", () => {
    it("単語を含むプロンプトを生成する", () => {
      const prompt = buildImagePrompt("らいおん");
      expect(prompt).toContain("らいおん");
    });

    it("子ども向けスタイルの指定を含む", () => {
      const prompt = buildImagePrompt("りんご");
      expect(prompt).toContain("水彩画");
      expect(prompt).toContain("子ども");
    });
  });

  describe("buildR2Key", () => {
    it("ユーザーIDと単語からキーを生成する", () => {
      const key = buildR2Key("user-123", "らいおん");
      expect(key).toBe("hakken/user-123/らいおん.webp");
    });

    it("異なるユーザーで異なるキーになる", () => {
      const key1 = buildR2Key("user-1", "いぬ");
      const key2 = buildR2Key("user-2", "いぬ");
      expect(key1).not.toBe(key2);
    });
  });
});
