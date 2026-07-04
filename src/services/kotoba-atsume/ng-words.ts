export const NG_WORDS: string[] = [
  "ばか",
  "あほ",
  "しね",
  "ころす",
  "きもい",
  "うざい",
  "くそ",
  "ちんこ",
  "まんこ",
  "おっぱい",
  "うんこ",
  "せっくす",
];

export function isNgWord(word: string): boolean {
  return NG_WORDS.some(ng => word.includes(ng));
}
