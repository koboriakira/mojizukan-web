import { describe, it, expect } from "vitest";
import { classifyWord, getRandomWords } from "../services/kotoba-atsume/hakken-logic";
import { isNgWord } from "../services/kotoba-atsume/ng-words";

describe("isNgWord", () => {
  it("NGリストにない言葉は false を返す", () => {
    expect(isNgWord("らいおん")).toBe(false);
  });
});

describe("classifyWord", () => {
  it("NGワードは ng を返す", () => {
    const result = classifyWord({ word: "NGテスト", collected: [], prepared: [], ngList: ["NGテスト"] });
    expect(result.status).toBe("ng");
  });

  it("辞書語もキャッシュ未確認なら ok を返す", () => {
    const result = classifyWord({ word: "いぬ", collected: [], prepared: [], ngList: [] });
    expect(result.status).toBe("ok");
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

  it("ng チェックは ok より優先される", () => {
    const result = classifyWord({ word: "いぬ", collected: [], prepared: [], ngList: ["いぬ"] });
    expect(result.status).toBe("ng");
  });
});

describe("getRandomWords", () => {
  it("prepared がある場合は指定した数のワードを返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, collected: [], prepared });
    expect(result.words).toHaveLength(3);
    expect(result.mode).toBe("normal");
  });

  it("仕込み済みワードを優先的に返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか"];
    const result = getRandomWords({ n: 3, collected: [], prepared });
    for (const word of result.words) {
      expect(prepared).toContain(word);
    }
  });

  it("prepared と collected が両方空の場合は mode: exhausted", () => {
    const result = getRandomWords({ n: 3, collected: [], prepared: [] });
    expect(result.words).toHaveLength(0);
    expect(result.mode).toBe("exhausted");
  });

  it("prepared が空で collected がある場合は mode: review", () => {
    const collected = ["らいおん", "ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, collected, prepared: [] });
    expect(result.mode).toBe("review");
    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(collected).toContain(w);
    }
  });

  it("prepared が足りない場合は prepared 優先で collected から補完し mode は normal", () => {
    const prepared = ["らいおん"];
    const collected = ["ぺんぎん", "いるか", "くじら"];
    const result = getRandomWords({ n: 3, collected, prepared });
    expect(result.words).toContain("らいおん");
    expect(result.words).toHaveLength(3);
    expect(result.mode).toBe("normal");
  });

  it("収集済みの prepared は prepared プールから除外する", () => {
    // n を uncollectedPrepared 数以下にして review 補完が発生しないシナリオ
    const prepared = ["らいおん", "ぺんぎん", "いるか"];
    const collected = ["らいおん"];
    const result = getRandomWords({ n: 2, collected, prepared });
    expect(result.words).not.toContain("らいおん");
    expect(result.words).toHaveLength(2);
  });

  it("prepared が n 個以上なら prepared から n 個返す", () => {
    const prepared = ["らいおん", "ぺんぎん", "いるか", "くじら", "かめ"];
    const result = getRandomWords({ n: 3, collected: [], prepared });
    expect(result.words).toHaveLength(3);
    for (const w of result.words) {
      expect(prepared).toContain(w);
    }
  });
});
