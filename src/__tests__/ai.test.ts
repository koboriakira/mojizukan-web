import { describe, it, expect } from "vitest";
import { extractJson } from "../services/ai-generation/ai";

describe("extractJson", () => {
  it("素の JSON 文字列をパースできる", () => {
    const input = '{"emoji":"🐘","description":"おおきな はなが とくちょうだよ。"}';
    const result = extractJson<{ emoji: string; description: string }>(input);
    expect(result.emoji).toBe("🐘");
    expect(result.description).toBe("おおきな はなが とくちょうだよ。");
  });

  it("マークダウンコードフェンスで囲まれた JSON をパースできる", () => {
    const input = '```json\n{"emoji":"🐘","description":"test"}\n```';
    const result = extractJson<{ emoji: string }>(input);
    expect(result.emoji).toBe("🐘");
  });

  it("前後にテキストがある場合でも JSON を抽出できる", () => {
    const input = 'Here is the result:\n{"emoji":"🐘","description":"test"}\nDone.';
    const result = extractJson<{ emoji: string }>(input);
    expect(result.emoji).toBe("🐘");
  });

  it("JSON がない文字列では例外をスローする", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
