import { describe, it, expect } from "vitest";
import { buildStoryPrompt } from "../services/ohanashi/story-prompt";

describe("buildStoryPrompt", () => {
  it("指定した言葉がプロンプトに含まれる", () => {
    const prompt = buildStoryPrompt(["りんご", "ねこ"]);
    expect(prompt).toContain("りんご");
    expect(prompt).toContain("ねこ");
  });

  it("複数の言葉をカンマ区切りで列挙する", () => {
    const prompt = buildStoryPrompt(["いぬ", "ねこ", "とり"]);
    expect(prompt).toContain("いぬ、ねこ、とり");
  });

  it("JSON形式での出力指示が含まれる", () => {
    const prompt = buildStoryPrompt(["りんご"]);
    expect(prompt).toContain("pages");
    expect(prompt).toContain("tokens");
    expect(prompt).toContain("hero");
  });

  it("word トークン形式の説明が含まれる", () => {
    const prompt = buildStoryPrompt(["りんご"]);
    expect(prompt).toContain('"t":"word"');
    expect(prompt).toContain('"t":"text"');
  });

  it("3ページの指示が含まれる", () => {
    const prompt = buildStoryPrompt(["りんご"]);
    expect(prompt).toContain("3ページ");
  });
});
