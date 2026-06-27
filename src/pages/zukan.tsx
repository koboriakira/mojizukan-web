import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import type { ZukanEntry } from "../types";
import { CATEGORIES } from "../types";

export const ZukanPage: FC<{ entries: ZukanEntry[]; presetCounts: Record<string, { registered: number; total: number }> }> = ({
  entries,
  presetCounts,
}) => {
  const totalCount = entries.length;
  const discoveredEntries = entries.filter((e) => e.is_discovered);
  const presetEntries = entries.filter((e) => !e.is_discovered);

  const entriesByCategory: Record<string, ZukanEntry[]> = {};
  for (const entry of presetEntries) {
    const cat = entry.category ?? "その他";
    if (!entriesByCategory[cat]) entriesByCategory[cat] = [];
    entriesByCategory[cat].push(entry);
  }

  return (
    <Layout title="ずかん - もじずかん">
      <nav>
        <a href="/">🏠 もどる</a>
        <a href="/play">✏️ かく</a>
        <a href="/zukan" class="active">📖 ずかん</a>
      </nav>

      <h2 style="text-align: center; margin-bottom: 16px;">
        ずかん（{totalCount} けん）
      </h2>

      {CATEGORIES.map((cat) => {
        const catEntries = entriesByCategory[cat.name] ?? [];
        const counts = presetCounts[cat.name];
        if (!counts || counts.total === 0) return null;
        const isComplete = counts.registered >= counts.total;

        return (
          <div>
            <div class="category-header">
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              <span class="count">
                {counts.registered}/{counts.total}
              </span>
              {isComplete && <span>👑</span>}
            </div>
            <div class="grid">
              {catEntries.map((entry) => (
                <a href={`/zukan/${entry.id}`} class="card" style="text-decoration: none; color: inherit;">
                  <span class="emoji">{entry.emoji ?? "📝"}</span>
                  <span class="word">{entry.word}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}

      {discoveredEntries.length > 0 && (
        <div>
          <div class="category-header">
            <span>⭐</span>
            <span>はっけん</span>
            <span class="count">{discoveredEntries.length}けん</span>
          </div>
          <div class="grid">
            {discoveredEntries.map((entry) => (
              <a href={`/zukan/${entry.id}`} class="card" style="text-decoration: none; color: inherit;">
                <span class="emoji">{entry.emoji ?? "⭐"}</span>
                <span class="word">{entry.word}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div style="text-align: center; padding: 48px 0; color: #999;">
          <p style="font-size: 3rem;">📖</p>
          <p style="margin-top: 12px;">まだ なにも のっていないよ</p>
          <a href="/play" class="btn btn-coral" style="margin-top: 16px;">はじめる</a>
        </div>
      )}
    </Layout>
  );
};

export const ZukanDetailPage: FC<{ entry: ZukanEntry }> = ({ entry }) => {
  return (
    <Layout title={`${entry.word} - もじずかん`}>
      <nav>
        <a href="/zukan">📖 もどる</a>
        <a href="/play">✏️ かく</a>
      </nav>

      <div class="result">
        {entry.is_discovered ? (
          <span class="badge">⭐ はっけん</span>
        ) : null}
        <span class="emoji" style="margin-top: 12px;">
          {entry.image_url ? (
            <img src={entry.image_url} alt={entry.word} style="width: 200px; height: 200px; object-fit: contain;" />
          ) : (
            entry.emoji ?? "📝"
          )}
        </span>
        <p class="word">{entry.word}</p>
        {entry.description && <p class="desc">{entry.description}</p>}
        {entry.category && (
          <p style="margin-top: 12px; color: #999; font-size: 0.85rem;">
            {CATEGORIES.find((c) => c.name === entry.category)?.emoji} {entry.category}
          </p>
        )}
        <p style="margin-top: 8px; color: #bbb; font-size: 0.8rem;">
          {entry.created_at.split(" ")[0].replace(/-/g, "/")} に かいたよ
        </p>
      </div>

      <a href="/play" class="btn btn-coral">つぎも かく！</a>
    </Layout>
  );
};
