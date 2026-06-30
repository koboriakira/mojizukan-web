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

  it("既に収集済みの言葉は dup を返す", () => {
    const result = classifyWord({ word: "らいおん", collected: ["らいおん"], prepared: [], ngList: [] });
    expect(result.status).toBe("dup");
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
    const words = getRandomWords({ n: 3, collected: [], prepared: [] });
    expect(words).toHaveLength(3);
  });

  it("返すワードは収集済みリストに含まれない", () => {
    const collected = HAKKEN_WORDS.slice(0, 30);
    const words = getRandomWords({ n: 3, collected, prepared: [] });
    for (const word of words) {
      expect(collected).not.toContain(word);
    }
  });

  it("返すワードは仕込み済みリストに含まれない", () => {
    const prepared = HAKKEN_WORDS.slice(0, 30);
    const words = getRandomWords({ n: 3, collected: [], prepared });
    for (const word of words) {
      expect(prepared).not.toContain(word);
    }
  });

  it("利用可能なワードが足りない場合は最大数まで返す", () => {
    const collected = HAKKEN_WORDS.slice(0, 33);
    const words = getRandomWords({ n: 5, collected, prepared: [] });
    expect(words.length).toBeLessThanOrEqual(5);
  });
});
