import { Hono } from "hono";
import type { AppEnv, ZukanEntry } from "../types";
import { HomePage } from "../pages/home";
import { PlayPage, PlayResultPage } from "../pages/play";
import { ZukanPage, ZukanDetailPage } from "../pages/zukan";
import { findPresetWord, getPresetsByCategory } from "../lib/preset-dictionary";
import { validateWord, generateDescription } from "../lib/openai";
import { CATEGORIES } from "../types";

export const pages = new Hono<AppEnv>();

pages.get("/", (c) => {
  return c.html(<HomePage />);
});

pages.get("/play", (c) => {
  return c.html(<PlayPage />);
});

pages.post("/play", async (c) => {
  const form = await c.req.parseBody();
  const word = (form["word"] as string)?.trim();

  if (!word) {
    return c.html(<PlayResultPage word="" emoji={null} description={null} isDiscovered={false} isNew={false} error="ことばを いれてね" />);
  }

  const existing = await c.env.DB.prepare("SELECT * FROM entries WHERE word = ?")
    .bind(word)
    .first<ZukanEntry>();

  if (existing) {
    return c.html(
      <PlayResultPage
        word={existing.word}
        emoji={existing.emoji}
        description={existing.description}
        isDiscovered={!!existing.is_discovered}
        isNew={false}
      />,
    );
  }

  const preset = findPresetWord(word);

  if (preset) {
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO entries (id, word, category, is_discovered, emoji, description, created_at) VALUES (?, ?, ?, 0, ?, ?, datetime('now'))",
    )
      .bind(id, word, preset.category, preset.emoji, preset.description)
      .run();

    return c.html(
      <PlayResultPage word={word} emoji={preset.emoji} description={preset.description} isDiscovered={false} isNew={true} />,
    );
  }

  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.html(
      <PlayResultPage word={word} emoji={null} description={null} isDiscovered={false} isNew={false} error="まだ ずかんに ないよ" />,
    );
  }

  const validation = await validateWord(apiKey, word);
  if (!validation.valid) {
    return c.html(
      <PlayResultPage
        word={word}
        emoji={null}
        description={null}
        isDiscovered={false}
        isNew={false}
        error={validation.reason ?? "この ことばは ずかんに のせられないよ"}
      />,
    );
  }

  const desc = await generateDescription(apiKey, word);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO entries (id, word, category, is_discovered, emoji, description, created_at) VALUES (?, ?, ?, 1, ?, ?, datetime('now'))",
  )
    .bind(id, word, desc.category, desc.emoji, desc.text)
    .run();

  return c.html(<PlayResultPage word={word} emoji={desc.emoji} description={desc.text} isDiscovered={true} isNew={true} />);
});

pages.get("/zukan", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT * FROM entries ORDER BY created_at DESC",
  ).all<ZukanEntry>();
  const entries = results.results ?? [];

  const presetCounts: Record<string, { registered: number; total: number }> = {};
  for (const cat of CATEGORIES) {
    const total = getPresetsByCategory(cat.name).length;
    const registered = entries.filter((e) => !e.is_discovered && e.category === cat.name).length;
    presetCounts[cat.name] = { registered, total };
  }

  return c.html(<ZukanPage entries={entries} presetCounts={presetCounts} />);
});

pages.get("/zukan/:id", async (c) => {
  const id = c.req.param("id");
  const entry = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?")
    .bind(id)
    .first<ZukanEntry>();

  if (!entry) {
    return c.redirect("/zukan");
  }

  return c.html(<ZukanDetailPage entry={entry} />);
});
