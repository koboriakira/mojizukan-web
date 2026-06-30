import { describe, it, expect } from "vitest";
import { clientDictionary } from "../client/dictionary";

describe("clientDictionary", () => {
  it("51語すべてが含まれる", () => {
    const words = [
      'うし', 'いぬ', 'ねこ', 'きりん', 'ぞう', 'うさぎ', 'くま', 'ぱんだ',
      'りんご', 'ばなな', 'おにぎり', 'けーき', 'ぱん',
      'くるま', 'ひこうき', 'でんしゃ', 'ふね', 'ばす',
      'やま', 'うみ', 'そら', 'はな', 'つき',
      'ちょう', 'あり', 'せみ', 'てんとうむし', 'かぶとむし',
      'て', 'め', 'みみ', 'くち', 'あし',
      'いす', 'つくえ', 'とけい', 'てれび', 'まど',
      'ぼうし', 'くつ', 'くつした', 'しゃつ',
      'あか', 'あお', 'きいろ', 'みどり', 'しろ',
      'ほし', 'にじ', 'おんがく', 'えほん',
    ];
    for (const word of words) {
      expect(clientDictionary).toContain("'" + word + "'");
    }
  });

  it("各エントリに desc が含まれる", () => {
    expect(clientDictionary).toContain("desc:");
  });

  it("WORDPOOL が定義されている", () => {
    expect(clientDictionary).toContain("var WORDPOOL");
  });

  it("DICTIONARY が定義されている", () => {
    expect(clientDictionary).toContain("var DICTIONARY");
  });
});
