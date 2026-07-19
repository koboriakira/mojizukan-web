export interface ZukanEntry {
  id: string;
  word: string;
  category: string | null;
  is_hakken: number;
  image_url: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateEntryRequest {
  word: string;
  category?: string;
}

export interface DiscoverEntryRequest {
  word: string;
}

export interface DictionaryWord {
  word: string;
  category: WordCategory;
  description: string;
}

export type WordCategory =
  | "どうぶつ"
  | "たべもの"
  | "のりもの"
  | "しぜん"
  | "むし"
  | "からだ"
  | "いえのもの"
  | "ふく"
  | "いろ"
  | "その他";

export interface CategoryInfo {
  name: WordCategory;
}

export const CATEGORIES: CategoryInfo[] = [
  { name: "どうぶつ" },
  { name: "たべもの" },
  { name: "のりもの" },
  { name: "しぜん" },
  { name: "むし" },
  { name: "からだ" },
  { name: "いえのもの" },
  { name: "ふく" },
  { name: "いろ" },
  { name: "その他" },
];

export type ClassifyStatus = 'ok' | 'rediscovery' | 'prepared' | 'ng';

export interface ClassifyRequest {
  word: string;
  zukanWords: string[];
  prepared: string[];
}

export interface ClassifyResponse {
  status: ClassifyStatus;
  message: string;
}

export interface HakkenGenerateRequest {
  word: string;
  userId: string;
}

export interface HakkenGenerateResponse {
  description: string;
}

// おためしことば（ADR-0003）の許可リスト。ゲストの出題プールおよび
// guest-account-data-lifecycle spec のマージAPI許可リストの両方から参照する正典。
// src/client/dictionary.ts の STARTER_WORDS、bin/seed-starter-words.sh の WORDS と
// 同期させること（値を変更したら3箇所とも揃える）。
export const STARTER_WORDS: readonly string[] = [
  "いぬ", "うま", "くま", "さかな", "すいか",
  "つき", "とり", "ねこ", "はな", "やま",
];

export interface MergeGuestEntriesRequest {
  words: string[];
}

export interface MergeGuestEntriesResponse {
  merged: string[];
}
