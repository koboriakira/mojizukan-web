import { describe, it, expect } from "vitest";
import { clientDictionary } from "../client/dictionary";

describe("clientDictionary", () => {
  it("スターター10語すべてが含まれる", () => {
    const words = [
      'あり', 'いす', 'いぬ', 'くつ', 'くま',
      'つき', 'ねこ', 'はな', 'ぱん', 'ふね',
    ];
    for (const word of words) {
      expect(clientDictionary).toContain("'" + word + "'");
    }
  });

  it("各エントリに desc が含まれる", () => {
    expect(clientDictionary).toContain("desc:");
  });

  it("STARTER_WORDS が定義されている", () => {
    expect(clientDictionary).toContain("var STARTER_WORDS");
  });
});
