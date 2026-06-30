import type { DictionaryWord, WordCategory } from "../types";

const DICTIONARY_WORDS: DictionaryWord[] = [
  // どうぶつ
  { word: "うし", category: "どうぶつ", description: "おおきな からだで のんびり くさを たべるよ。「もー」と ないて おしえてくれるよ。" },
  { word: "いぬ", category: "どうぶつ", description: "しっぽを ふって よろこぶよ。おさんぽが だいすきなんだ。" },
  { word: "ねこ", category: "どうぶつ", description: "ふわふわの けがわが きもちいいよ。ごろごろ のどを ならすんだ。" },
  { word: "きりん", category: "どうぶつ", description: "ながーい くびで たかい きの はっぱも たべられるよ。" },
  { word: "ぞう", category: "どうぶつ", description: "おおきな からだと ながい はなが とくちょうだよ。" },
  { word: "うさぎ", category: "どうぶつ", description: "ながい みみと まるい しっぽが かわいいよ。ぴょんぴょん はねるんだ。" },
  { word: "くま", category: "どうぶつ", description: "おおきくて ちからもち。はちみつが だいすきなんだよ。" },
  { word: "ぱんだ", category: "どうぶつ", description: "しろと くろの もようが すてきだよ。ささの はっぱを たべるんだ。" },

  // たべもの
  { word: "りんご", category: "たべもの", description: "あかくて まるい くだものだよ。しゃりしゃり おいしいね。" },
  { word: "ばなな", category: "たべもの", description: "きいろい かわを むいて たべるよ。あまくて やわらかいんだ。" },
  { word: "おにぎり", category: "たべもの", description: "ごはんを にぎって つくるよ。のりで まいたら できあがり。" },
  { word: "けーき", category: "たべもの", description: "ふわふわの すぽんじに くりーむを のせるよ。おたんじょうびに たべるね。" },
  { word: "ぱん", category: "たべもの", description: "こむぎこを こねて やくと できるよ。あさごはんに ぴったりだね。" },

  // のりもの
  { word: "くるま", category: "のりもの", description: "たいやが くるくる まわって はしるよ。おでかけに べんりだね。" },
  { word: "ひこうき", category: "のりもの", description: "おおきな つばさで そらを とぶよ。とおい ところにも いけるんだ。" },
  { word: "でんしゃ", category: "のりもの", description: "せんろの うえを はしるよ。がたんごとん いい おとがするね。" },
  { word: "ふね", category: "のりもの", description: "うみの うえを すすむよ。おおきな ふねは たくさん ひとを はこべるんだ。" },
  { word: "ばす", category: "のりもの", description: "みんなを のせて まちを はしるよ。ばすていで まっていると きてくれるんだ。" },

  // しぜん
  { word: "やま", category: "しぜん", description: "たかくて おおきいよ。のぼると とおくまで みえるんだ。" },
  { word: "うみ", category: "しぜん", description: "ひろくて あおい おみずだよ。なみが ざぶーん と くるよ。" },
  { word: "そら", category: "しぜん", description: "みあげると ひろがる あおい せかいだよ。くもが ふわふわ うかんでいるね。" },
  { word: "はな", category: "しぜん", description: "きれいな いろで さくよ。いい においが するんだ。" },
  { word: "つき", category: "しぜん", description: "よるの そらに ひかるよ。まるかったり みかづきだったり するんだ。" },

  // むし
  { word: "ちょう", category: "むし", description: "きれいな はねで ひらひら とぶよ。おはなの みつが だいすきなんだ。" },
  { word: "あり", category: "むし", description: "ちいさいけど ちからもちだよ。みんなで ちからを あわせて はこぶんだ。" },
  { word: "せみ", category: "むし", description: "なつに みーんみーんと なくよ。きの みきに とまっているんだ。" },
  { word: "てんとうむし", category: "むし", description: "あかい からだに くろい てんてんが あるよ。ちいさくて まるいんだ。" },
  { word: "かぶとむし", category: "むし", description: "りっぱな つのが かっこいいよ。なつの もりで みつけられるんだ。" },

  // からだ
  { word: "て", category: "からだ", description: "ものを つかんだり さわったり するよ。ゆびが ごほん あるんだ。" },
  { word: "め", category: "からだ", description: "いろんな ものを みることが できるよ。ふたつ あるんだ。" },
  { word: "みみ", category: "からだ", description: "おとを きくことが できるよ。かおの よこに あるんだ。" },
  { word: "くち", category: "からだ", description: "たべたり はなしたり するよ。にっこり わらうと すてきだね。" },
  { word: "あし", category: "からだ", description: "あるいたり はしったり するよ。からだを ささえてくれるんだ。" },

  // いえのもの
  { word: "いす", category: "いえのもの", description: "すわるための かぐだよ。ごはんの ときに つかうよね。" },
  { word: "つくえ", category: "いえのもの", description: "ものを おいたり おべんきょう したり するよ。" },
  { word: "とけい", category: "いえのもの", description: "じかんを おしえてくれるよ。はりが くるくる まわるんだ。" },
  { word: "てれび", category: "いえのもの", description: "えが うつる はこだよ。おもしろい ばんぐみが みられるんだ。" },
  { word: "まど", category: "いえのもの", description: "おうちの かべに あるよ。あけると かぜが はいってきて きもちいいね。" },

  // ふく
  { word: "ぼうし", category: "ふく", description: "あたまに かぶるよ。おひさまから まもってくれるんだ。" },
  { word: "くつ", category: "ふく", description: "あしに はいて あるくよ。おそとに いくとき はこうね。" },
  { word: "くつした", category: "ふく", description: "あしに はく ぬのだよ。あったかくて きもちいいね。" },
  { word: "しゃつ", category: "ふく", description: "うえに きる ふくだよ。ぼたんが ついているのも あるんだ。" },

  // いろ
  { word: "あか", category: "いろ", description: "りんごや ぽすとの いろだよ。げんきな いろだね。" },
  { word: "あお", category: "いろ", description: "そらや うみの いろだよ。すずしくて さわやかだね。" },
  { word: "きいろ", category: "いろ", description: "ばななや ひまわりの いろだよ。あかるくて たのしいね。" },
  { word: "みどり", category: "いろ", description: "はっぱや くさの いろだよ。しぜんが いっぱいの いろだね。" },
  { word: "しろ", category: "いろ", description: "ゆきや くもの いろだよ。きれいで すっきりしているね。" },

  // その他
  { word: "ほし", category: "その他", description: "よるの そらに きらきら ひかるよ。いっぱい あるんだ。" },
  { word: "にじ", category: "その他", description: "あめの あとに そらに でるよ。なないろで とっても きれいだね。" },
  { word: "おんがく", category: "その他", description: "みみで きくと たのしくなるよ。うたったり おどったり しちゃうね。" },
  { word: "えほん", category: "その他", description: "えと おはなしが いっぱいだよ。よんでもらうと わくわくするね。" },
];

export function findDictionaryWord(word: string): DictionaryWord | undefined {
  return DICTIONARY_WORDS.find((p) => p.word === word) ?? findWithNormalization(word);
}

export function getDictionaryWordsByCategory(category: WordCategory): DictionaryWord[] {
  return DICTIONARY_WORDS.filter((p) => p.category === category);
}

export function getAllDictionaryWords(): DictionaryWord[] {
  return [...DICTIONARY_WORDS];
}

function findWithNormalization(word: string): DictionaryWord | undefined {
  const normalized = normalizeKana(word);
  if (normalized === word) return undefined;
  return DICTIONARY_WORDS.find((p) => p.word === normalized);
}

const SMALL_TO_LARGE: Record<string, string> = {
  "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
  "ゃ": "や", "ゅ": "ゆ", "ょ": "よ", "っ": "つ",
};

function normalizeKana(word: string): string {
  return [...word].map((c) => SMALL_TO_LARGE[c] ?? c).join("");
}
