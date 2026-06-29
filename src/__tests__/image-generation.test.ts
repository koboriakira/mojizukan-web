import { describe, it, expect } from "vitest";
import { buildR2Key } from "../lib/image";
import { buildImagePrompt, getStyleConfig, getAllStyles } from "../lib/image-styles";

describe("みつける・たんけんの画像生成", () => {
  describe("buildImagePrompt", () => {
    it("単語を含むプロンプトを生成する", () => {
      const prompt = buildImagePrompt("ehon", "らいおん");
      expect(prompt).toContain("らいおん");
    });

    it("スタイルごとに異なるプロンプトを返す", () => {
      const ehon = buildImagePrompt("ehon", "りんご");
      const pop = buildImagePrompt("pop", "りんご");
      expect(ehon).not.toBe(pop);
      expect(ehon).toContain("watercolor");
      expect(pop).toContain("cartoon");
    });

    it("全スタイルで単語が埋め込まれる", () => {
      const styles = ["honwaka", "ehon", "pop", "watercolor", "zukan"] as const;
      for (const style of styles) {
        const prompt = buildImagePrompt(style, "ねこ");
        expect(prompt).toContain("ねこ");
      }
    });
  });

  describe("getStyleConfig", () => {
    it("各スタイルのラベルを返す", () => {
      expect(getStyleConfig("honwaka").label).toBe("ほんわか");
      expect(getStyleConfig("ehon").label).toBe("えほん");
      expect(getStyleConfig("pop").label).toBe("ポップ");
      expect(getStyleConfig("watercolor").label).toBe("やさしい水彩");
      expect(getStyleConfig("zukan").label).toBe("ずかん");
    });
  });

  describe("getAllStyles", () => {
    it("5つのスタイルを返す", () => {
      const styles = getAllStyles();
      expect(styles).toHaveLength(5);
      expect(styles.map(s => s.key)).toEqual(["honwaka", "ehon", "pop", "watercolor", "zukan"]);
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
