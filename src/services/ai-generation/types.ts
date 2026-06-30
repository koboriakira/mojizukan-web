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
