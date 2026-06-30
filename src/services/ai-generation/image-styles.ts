import type { ImageStyle } from "../../types";

interface StyleConfig {
  label: string;
  promptTemplate: string;
}

const STYLE_CONFIGS: Record<ImageStyle, StyleConfig> = {
  honwaka: {
    label: "ほんわか",
    promptTemplate:
      "A cute illustration of {subject} in soft pastel colors with rounded shapes, gentle and warm style, suitable for children. White background, no text, no letters.",
  },
  ehon: {
    label: "えほん",
    promptTemplate:
      "A picture book illustration of {subject} in pencil and watercolor hand-drawn style, warm and nostalgic. White background, no text, no letters.",
  },
  pop: {
    label: "ポップ",
    promptTemplate:
      "A cartoon illustration of {subject} with thick black outlines, vivid and bright colors, fun cartoon style for kids. White background, no text, no letters.",
  },
  watercolor: {
    label: "やさしい水彩",
    promptTemplate:
      "A transparent watercolor painting of {subject}, delicate and airy, beautiful gradients, artistic watercolor style. White background, no text, no letters.",
  },
  zukan: {
    label: "ずかん",
    promptTemplate:
      "A detailed encyclopedia-style scientific illustration of {subject}, accurate proportions, natural history illustration style. White background, no text, no letters.",
  },
};

export function getStyleConfig(style: ImageStyle): StyleConfig {
  return STYLE_CONFIGS[style];
}

export function buildImagePrompt(style: ImageStyle, englishWord: string): string {
  return getStyleConfig(style).promptTemplate.replace("{subject}", englishWord);
}

export function getAllStyles(): Array<{ key: ImageStyle; label: string }> {
  return Object.entries(STYLE_CONFIGS).map(([key, config]) => ({
    key: key as ImageStyle,
    label: config.label,
  }));
}
