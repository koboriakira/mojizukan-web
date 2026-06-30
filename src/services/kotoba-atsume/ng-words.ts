export const NG_WORDS: string[] = [
  // Basic inappropriate words for children's app (keep minimal, expand later)
];

export function isNgWord(word: string): boolean {
  return NG_WORDS.some(ng => word.includes(ng));
}
