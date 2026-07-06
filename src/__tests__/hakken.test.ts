import { describe, it, expect } from "vitest";
import { classifyWord, getRandomWords } from "../services/kotoba-atsume/hakken-logic";
import { isNgWord, NG_WORDS } from "../services/kotoba-atsume/ng-words";

describe("isNgWord", () => {
  it("NGリストにない言葉は false を返す", () => {
    expect(isNgWord("らいおん")).toBe(false);
  });

  it("部分一致で判定する（語の中にNG語が含まれれば true）", () => {
    // NG_WORDS が空でない前提のテスト用にカスタムリストを使う classifyWord でテスト
    const result = classifyWord({ word: "あばか", zukanWords: [], prepared: [], ngList: ["ばか"] });
    expect(result.status).toBe("ng");
  });

  it("完全一致でなくても部分一致で拒否する", () => {
    const result = classifyWord({ word: "ばかもの", zukanWords: [], prepared: [], ngList: ["ばか"] });
    expect(result.status).toBe("ng");
  });

  it("NG語を含まない語は通過する", () => {
    const result = classifyWord({ word: "らいおん", zukanWords: [], prepared: [], ngList: ["ばか"] });
    expect(result.status).toBe("ok");
  });

  it("NG_WORDS は配列としてエクスポートされている", () => {
    expect(Array.isArray(NG_WORDS)).toBe(true);
  });
});

describe("classifyWord", () => {
  it("NGワードは ng を返す", () => {
    const result = classifyWord({ word: "NGテスト", zukanWords: [], prepared: [], ngList: ["NGテスト"] });
    expect(result.status).toBe("ng");
  });

  it("辞書語もキャッシュ未確認なら ok を返す", () => {
    const result = classifyWord({ word: "いぬ", zukanWords: [], prepared: [], ngList: [] });
    expect(result.status).toBe("ok");
  });

  it("既に収集済みの言葉は rediscovery を返す", () => {
    const result = classifyWord({ word: "らいおん", zukanWords: ["らいおん"], prepared: [], ngList: [] });
    expect(result.status).toBe("rediscovery");
  });

  it("仕込み済みの言葉は prepared を返す", () => {
    const result = classifyWord({ word: "らいおん", zukanWords: [], prepared: ["らいおん"], ngList: [] });
    expect(result.status).toBe("prepared");
  });

  it("問題のない言葉は ok を返す", () => {
    const result = classifyWord({ word: "らいおん", zukanWords: [], prepared: [], ngList: [] });
    expect(result.status).toBe("ok");
  });

  it("ng チェックは ok より優先される", () => {
    const result = classifyWord({ word: "いぬ", zukanWords: [], prepared: [], ngList: ["いぬ"] });
    expect(result.status).toBe("ng");
  });
});

describe("getRandomWords", () => {
  it("prepared がある場合は指定した数のワードを返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, zukanWords: [], prepared });
    expect(result.words).toHaveLength(3);
    expect(result.mode).toBe("normal");
  });

  it("仕込み済みワードを優先的に返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか"];
    const result = getRandomWords({ n: 3, zukanWords: [], prepared });
    for (const word of result.words) {
      expect(prepared).toContain(word);
    }
  });

  it("prepared と zukanWords が両方空の場合は mode: exhausted", () => {
    const result = getRandomWords({ n: 3, zukanWords: [], prepared: [] });
    expect(result.words).toHaveLength(0);
    expect(result.mode).toBe("exhausted");
  });

  it("prepared が空で zukanWords がある場合は mode: review", () => {
    const zukanWords = ["らいおん", "ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, zukanWords, prepared: [] });
    expect(result.mode).toBe("review");
    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(zukanWords).toContain(w);
    }
  });

  it("prepared が足りない場合は prepared 優先で zukanWords から補完し mode は normal", () => {
    const prepared = ["らいおん"];
    const zukanWords = ["ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, zukanWords, prepared });
    expect(result.words).toContain("らいおん");
    expect(result.words).toHaveLength(3);
    expect(result.mode).toBe("normal");
  });

  it("収集済みの prepared は prepared プールから除外する", () => {
    // n を未収集 prepared 数以下にして review 補完が発生しないシナリオ
    const prepared = ["らいおん", "ぺんぎん", "いるか"];
    const zukanWords = ["らいおん"];
    const result = getRandomWords({ n: 2, zukanWords, prepared });
    expect(result.words).not.toContain("らいおん");
    expect(result.words).toHaveLength(2);
  });

  it("prepared が n 個以上なら prepared から n 個返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか", "くじら", "かめ"];
    const result = getRandomWords({ n: 3, zukanWords: [], prepared });
    expect(result.words).toHaveLength(3);
    for (const w of result.words) {
      expect(prepared).toContain(w);
    }
  });
});
