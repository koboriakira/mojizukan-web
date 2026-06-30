import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyWord, getRandomWords } from "../routes/hakken";
import { isNgWord } from "../services/kotoba-atsume/ng-words";
import { HAKKEN_WORDS } from "../services/kotoba-atsume/hakken-words";

describe("isNgWord", () => {
  it("NGリストにない言葉は false を返す", () => {
    expect(isNgWord("らいおん")).toBe(false);
  });
});

describe("HAKKEN_WORDS", () => {
  it("35個のワードが定義されている", () => {
    expect(HAKKEN_WORDS).toHaveLength(35);
  });

  it("ひらがなと長音符のみで構成されている", () => {
    for (const word of HAKKEN_WORDS) {
      expect(word).toMatch(/^[ぁ-んー]+$/);
    }
  });
});

describe("classifyWord", () => {
  it("NGワードは ng を返す", () => {
    const result = classifyWord({ word: "NGテスト", collected: [], prepared: [], ngList: ["NGテスト"] });
    expect(result.status).toBe("ng");
  });

  it("プリセット辞書の言葉は dict を返す", () => {
    const result = classifyWord({ word: "いぬ", collected: [], prepared: [], ngList: [] });
    expect(result.status).toBe("dict");
  });

  it("既に収集済みの言葉は rediscovery を返す", () => {
    const result = classifyWord({ word: "らいおん", collected: ["らいおん"], prepared: [], ngList: [] });
    expect(result.status).toBe("rediscovery");
  });

  it("仕込み済みの言葉は prepared を返す", () => {
    const result = classifyWord({ word: "らいおん", collected: [], prepared: ["らいおん"], ngList: [] });
    expect(result.status).toBe("prepared");
  });

  it("問題のない言葉は ok を返す", () => {
    const result = classifyWord({ word: "らいおん", collected: [], prepared: [], ngList: [] });
    expect(result.status).toBe("ok");
  });

  it("ng チェックは dict チェックより優先される", () => {
    const result = classifyWord({ word: "いぬ", collected: [], prepared: [], ngList: ["いぬ"] });
    expect(result.status).toBe("ng");
  });
});

describe("getRandomWords", () => {
  it("指定した数のワードを返す", () => {
    const result = getRandomWords({ n: 3, collected: [], prepared: [] });
    expect(result.words).toHaveLength(3);
  });

  it("返すワードは収集済みリストに含まれない", () => {
    const collected = HAKKEN_WORDS.slice(0, 30);
    const result = getRandomWords({ n: 3, collected, prepared: [] });
    for (const word of result.words) {
      expect(collected).not.toContain(word);
    }
  });

  it("仕込み済みワードを優先的に返す", () => {
    const prepared = HAKKEN_WORDS.slice(0, 30);
    const result = getRandomWords({ n: 3, collected: [], prepared });
    for (const word of result.words) {
      expect(prepared).toContain(word);
    }
  });

  it("利用可能なワードが足りない場合は最大数まで返す", () => {
    const collected = HAKKEN_WORDS.slice(0, 33);
    const result = getRandomWords({ n: 5, collected, prepared: [] });
    expect(result.words.length).toBeLessThanOrEqual(5);
  });

  it("新規ワードがある場合は mode: normal", () => {
    const result = getRandomWords({ n: 3, collected: [], prepared: [] });
    expect(result.mode).toBe("normal");
  });

  it("全ワード収集済みで collected がある場合は mode: review", () => {
    const result = getRandomWords({ n: 3, collected: HAKKEN_WORDS, prepared: [] });
    expect(result.mode).toBe("review");
    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(HAKKEN_WORDS).toContain(w);
    }
  });

  it("prepared が全ワードでも未収集なら mode: normal", () => {
    const result = getRandomWords({ n: 3, collected: [], prepared: HAKKEN_WORDS });
    expect(result.mode).toBe("normal");
    expect(result.words).toHaveLength(3);
  });
});
