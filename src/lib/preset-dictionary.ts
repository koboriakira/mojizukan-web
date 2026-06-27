import type { PresetWord, WordCategory } from "../types";

const PRESET_WORDS: PresetWord[] = [
  // どうぶつ
  { word: "うし", emoji: "🐄", category: "どうぶつ", description: "おおきな からだで のんびり くさを たべるよ。「もー」と ないて おしえてくれるよ。" },
  { word: "いぬ", emoji: "🐕", category: "どうぶつ", description: "しっぽを ふって よろこぶよ。おさんぽが だいすきなんだ。" },
  { word: "ねこ", emoji: "🐈", category: "どうぶつ", description: "ふわふわの けがわが きもちいいよ。ごろごろ のどを ならすんだ。" },
  { word: "きりん", emoji: "🦒", category: "どうぶつ", description: "ながーい くびで たかい きの はっぱも たべられるよ。" },
  { word: "ぞう", emoji: "🐘", category: "どうぶつ", description: "おおきな からだと ながい はなが とくちょうだよ。" },
  { word: "うさぎ", emoji: "🐇", category: "どうぶつ", description: "ながい みみと まるい しっぽが かわいいよ。ぴょんぴょん はねるんだ。" },
  { word: "くま", emoji: "🐻", category: "どうぶつ", description: "おおきくて ちからもち。はちみつが だいすきなんだよ。" },
  { word: "ぱんだ", emoji: "🐼", category: "どうぶつ", description: "しろと くろの もようが すてきだよ。ささの はっぱを たべるんだ。" },

  // たべもの
  { word: "りんご", emoji: "🍎", category: "たべもの", description: "あかくて まるい くだものだよ。しゃりしゃり おいしいね。" },
  { word: "ばなな", emoji: "🍌", category: "たべもの", description: "きいろい かわを むいて たべるよ。あまくて やわらかいんだ。" },
  { word: "おにぎり", emoji: "🍙", category: "たべもの", description: "ごはんを にぎって つくるよ。のりで まいたら できあがり。" },
  { word: "けーき", emoji: "🎂", category: "たべもの", description: "ふわふわの すぽんじに くりーむを のせるよ。おたんじょうびに たべるね。" },
  { word: "ぱん", emoji: "🍞", category: "たべもの", description: "こむぎこを こねて やくと できるよ。あさごはんに ぴったりだね。" },

  // のりもの
  { word: "くるま", emoji: "🚗", category: "のりもの", description: "たいやが くるくる まわって はしるよ。おでかけに べんりだね。" },
  { word: "ひこうき", emoji: "✈️", category: "のりもの", description: "おおきな つばさで そらを とぶよ。とおい ところにも いけるんだ。" },
  { word: "でんしゃ", emoji: "🚃", category: "のりもの", description: "せんろの うえを はしるよ。がたんごとん いい おとがするね。" },
  { word: "ふね", emoji: "🚢", category: "のりもの", description: "うみの うえを すすむよ。おおきな ふねは たくさん ひとを はこべるんだ。" },
  { word: "ばす", emoji: "🚌", category: "のりもの", description: "みんなを のせて まちを はしるよ。ばすていで まっていると きてくれるんだ。" },

  // しぜん
  { word: "やま", emoji: "⛰️", category: "しぜん", description: "たかくて おおきいよ。のぼると とおくまで みえるんだ。" },
  { word: "うみ", emoji: "🌊", category: "しぜん", description: "ひろくて あおい おみずだよ。なみが ざぶーん と くるよ。" },
  { word: "そら", emoji: "🌤️", category: "しぜん", description: "みあげると ひろがる あおい せかいだよ。くもが ふわふわ うかんでいるね。" },
  { word: "はな", emoji: "🌸", category: "しぜん", description: "きれいな いろで さくよ。いい においが するんだ。" },
  { word: "つき", emoji: "🌙", category: "しぜん", description: "よるの そらに ひかるよ。まるかったり みかづきだったり するんだ。" },

  // むし
  { word: "ちょう", emoji: "🦋", category: "むし", description: "きれいな はねで ひらひら とぶよ。おはなの みつが だいすきなんだ。" },
  { word: "あり", emoji: "🐜", category: "むし", description: "ちいさいけど ちからもちだよ。みんなで ちからを あわせて はこぶんだ。" },
  { word: "せみ", emoji: "🪰", category: "むし", description: "なつに みーんみーんと なくよ。きの みきに とまっているんだ。" },
  { word: "てんとうむし", emoji: "🐞", category: "むし", description: "あかい からだに くろい てんてんが あるよ。ちいさくて まるいんだ。" },
  { word: "かぶとむし", emoji: "🪲", category: "むし", description: "りっぱな つのが かっこいいよ。なつの もりで みつけられるんだ。" },

  // からだ
  { word: "て", emoji: "✋", category: "からだ", description: "ものを つかんだり さわったり するよ。ゆびが ごほん あるんだ。" },
  { word: "め", emoji: "👁️", category: "からだ", description: "いろんな ものを みることが できるよ。ふたつ あるんだ。" },
  { word: "みみ", emoji: "👂", category: "からだ", description: "おとを きくことが できるよ。かおの よこに あるんだ。" },
  { word: "くち", emoji: "👄", category: "からだ", description: "たべたり はなしたり するよ。にっこり わらうと すてきだね。" },
  { word: "あし", emoji: "🦶", category: "からだ", description: "あるいたり はしったり するよ。からだを ささえてくれるんだ。" },

  // いえのもの
  { word: "いす", emoji: "🪑", category: "いえのもの", description: "すわるための かぐだよ。ごはんの ときに つかうよね。" },
  { word: "つくえ", emoji: "🪵", category: "いえのもの", description: "ものを おいたり おべんきょう したり するよ。" },
  { word: "とけい", emoji: "🕐", category: "いえのもの", description: "じかんを おしえてくれるよ。はりが くるくる まわるんだ。" },
  { word: "てれび", emoji: "📺", category: "いえのもの", description: "えが うつる はこだよ。おもしろい ばんぐみが みられるんだ。" },
  { word: "まど", emoji: "🪟", category: "いえのもの", description: "おうちの かべに あるよ。あけると かぜが はいってきて きもちいいね。" },

  // ふく
  { word: "ぼうし", emoji: "🧢", category: "ふく", description: "あたまに かぶるよ。おひさまから まもってくれるんだ。" },
  { word: "くつ", emoji: "👟", category: "ふく", description: "あしに はいて あるくよ。おそとに いくとき はこうね。" },
  { word: "くつした", emoji: "🧦", category: "ふく", description: "あしに はく ぬのだよ。あったかくて きもちいいね。" },
  { word: "しゃつ", emoji: "👕", category: "ふく", description: "うえに きる ふくだよ。ぼたんが ついているのも あるんだ。" },

  // いろ
  { word: "あか", emoji: "🔴", category: "いろ", description: "りんごや ぽすとの いろだよ。げんきな いろだね。" },
  { word: "あお", emoji: "🔵", category: "いろ", description: "そらや うみの いろだよ。すずしくて さわやかだね。" },
  { word: "きいろ", emoji: "🟡", category: "いろ", description: "ばななや ひまわりの いろだよ。あかるくて たのしいね。" },
  { word: "みどり", emoji: "🟢", category: "いろ", description: "はっぱや くさの いろだよ。しぜんが いっぱいの いろだね。" },
  { word: "しろ", emoji: "⚪", category: "いろ", description: "ゆきや くもの いろだよ。きれいで すっきりしているね。" },

  // その他
  { word: "ほし", emoji: "⭐", category: "その他", description: "よるの そらに きらきら ひかるよ。いっぱい あるんだ。" },
  { word: "にじ", emoji: "🌈", category: "その他", description: "あめの あとに そらに でるよ。なないろで とっても きれいだね。" },
  { word: "おんがく", emoji: "🎵", category: "その他", description: "みみで きくと たのしくなるよ。うたったり おどったり しちゃうね。" },
  { word: "えほん", emoji: "📚", category: "その他", description: "えと おはなしが いっぱいだよ。よんでもらうと わくわくするね。" },
];

export function findPresetWord(word: string): PresetWord | undefined {
  return PRESET_WORDS.find((p) => p.word === word) ?? findWithNormalization(word);
}

export function getPresetsByCategory(category: WordCategory): PresetWord[] {
  return PRESET_WORDS.filter((p) => p.category === category);
}

export function getAllPresets(): PresetWord[] {
  return [...PRESET_WORDS];
}

function findWithNormalization(word: string): PresetWord | undefined {
  const normalized = normalizeKana(word);
  if (normalized === word) return undefined;
  return PRESET_WORDS.find((p) => p.word === normalized);
}

const SMALL_TO_LARGE: Record<string, string> = {
  "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
  "ゃ": "や", "ゅ": "ゆ", "ょ": "よ", "っ": "つ",
};

function normalizeKana(word: string): string {
  return [...word].map((c) => SMALL_TO_LARGE[c] ?? c).join("");
}
