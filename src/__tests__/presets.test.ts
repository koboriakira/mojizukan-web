import { describe, it, expect } from "vitest";
import { clientPresets } from "../client/presets";

describe("clientPresets", () => {
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
      expect(clientPresets).toContain("'" + word + "'");
    }
  });

  it("各エントリに cat, desc が含まれる", () => {
    expect(clientPresets).toContain("cat:");
    expect(clientPresets).toContain("desc:");
  });

  it("WORDPOOL が定義されている", () => {
    expect(clientPresets).toContain("var WORDPOOL");
  });

  it("PRESETS が定義されている", () => {
    expect(clientPresets).toContain("var PRESETS");
  });
});
