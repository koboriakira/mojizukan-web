export interface ZukanEntry {
  id: string;
  word: string;
  category: string | null;
  is_discovered: number;
  image_url: string | null;
  description: string | null;
  emoji: string | null;
  created_at: string;
}

export interface CreateEntryRequest {
  word: string;
  category?: string;
}

export interface DiscoverEntryRequest {
  word: string;
}

export interface PresetWord {
  word: string;
  emoji: string;
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
  emoji: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { name: "どうぶつ", emoji: "🐾" },
  { name: "たべもの", emoji: "🍎" },
  { name: "のりもの", emoji: "🚗" },
  { name: "しぜん", emoji: "🌍" },
  { name: "むし", emoji: "🐛" },
  { name: "からだ", emoji: "🖐️" },
  { name: "いえのもの", emoji: "🏠" },
  { name: "ふく", emoji: "👒" },
  { name: "いろ", emoji: "🎨" },
  { name: "その他", emoji: "📦" },
];

export type ImageStyle =
  | "honwaka"
  | "ehon"
  | "pop"
  | "watercolor"
  | "zukan";

export interface UserSettings {
  id: string;
  image_style: ImageStyle;
  is_premium: number;
  created_at: string;
  updated_at: string;
}

export interface StoryRequest {
  words: string[];
}

export interface StoryToken {
  t: "text" | "word";
  s?: string;
  w?: string;
}

export interface StoryPage {
  hero: string[];
  tokens: StoryToken[];
}

export interface StoryResponse {
  pages: StoryPage[];
}

export interface Bindings {
  DB: D1Database;
  IMAGES: R2Bucket;
  AI: Ai;
}

export interface AppEnv {
  Bindings: Bindings;
}

export type ClassifyStatus = 'ok' | 'dup' | 'seeded' | 'dict' | 'ng';

export interface ClassifyRequest {
  word: string;
  collected: string[];
  seeded: string[];
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
  emoji: string;
  description: string;
}
