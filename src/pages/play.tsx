import type { FC } from "hono/jsx";
import { Layout } from "./layout";

export const PlayPage: FC = () => {
  return (
    <Layout title="はじめる - もじずかん">
      <nav>
        <a href="/">🏠 もどる</a>
        <a href="/zukan">📖 ずかん</a>
      </nav>

      <div class="input-area">
        <p style="margin-bottom: 12px; font-size: 1.1rem;">ことばを いれてね</p>
        <form method="post" action="/play">
          <input
            type="text"
            name="word"
            placeholder="ひらがなで にゅうりょく"
            autocomplete="off"
            autofocus
          />
          <button type="submit" class="btn btn-coral" style="margin-top: 12px;">
            かんせい！
          </button>
        </form>
      </div>

      <div id="hint" style="text-align: center; color: #999; font-size: 0.9rem;">
        <p>ひらがなで ことばを いれて「かんせい！」を おしてね</p>
      </div>
    </Layout>
  );
};

export const PlayResultPage: FC<{
  word: string;
  emoji: string | null;
  description: string | null;
  isDiscovered: boolean;
  isNew: boolean;
  error?: string;
}> = ({ word, emoji, description, isDiscovered, isNew, error }) => {
  return (
    <Layout title={`${word} - もじずかん`}>
      <nav>
        <a href="/">🏠 もどる</a>
        <a href="/zukan">📖 ずかん</a>
      </nav>

      {error ? (
        <div class="error">
          <p style="font-size: 3rem;">🤔</p>
          <p style="margin-top: 12px;">{error}</p>
        </div>
      ) : (
        <div class="result">
          {isNew && (
            <p style="margin-bottom: 12px;">
              {isDiscovered ? (
                <span class="badge">⭐ はっけん！</span>
              ) : (
                <span class="badge" style="background: var(--mint);">📖 ずかんに のったよ！</span>
              )}
            </p>
          )}
          <span class="emoji">{emoji ?? "❓"}</span>
          <p class="word">{word}</p>
          {description && <p class="desc">{description}</p>}
        </div>
      )}

      <a href="/play" class="btn btn-coral">つぎも かく！</a>
      <a href="/zukan" class="btn btn-mint">ずかんを みる</a>
    </Layout>
  );
};
