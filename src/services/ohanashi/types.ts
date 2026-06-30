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

export interface StoryRecord {
  id: string;
  user_id: string;
  words: string;
  pages: string | null;
  status: string;
  created_at: string;
}
