import type { FC, PropsWithChildren } from "hono/jsx";

export const Layout: FC<PropsWithChildren<{ title?: string }>> = ({ title, children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ?? "もじずかん"}</title>
        <style>{`
          :root {
            --bg: rgb(255, 250, 240);
            --text: rgb(33, 25, 18);
            --accent: #ff8c00;
            --coral: rgb(242, 128, 77);
            --mint: rgb(102, 191, 140);
            --card-bg: rgb(255, 245, 225);
            --card-locked: rgba(128, 128, 128, 0.15);
            --radius: 16px;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Hiragino Maru Gothic ProN", "Kosugi Maru", system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
          }
          .container { max-width: 480px; margin: 0 auto; padding: 16px; }
          h1 { text-align: center; font-size: 2.5rem; margin: 24px 0; }
          .btn {
            display: block; width: 100%; padding: 16px; border: none;
            border-radius: var(--radius); font-size: 1.2rem;
            font-family: inherit; cursor: pointer; text-align: center;
            text-decoration: none; color: white; margin: 12px 0;
          }
          .btn-coral { background: var(--coral); }
          .btn-mint { background: var(--mint); }
          .btn-accent { background: var(--accent); }
          .btn:active { opacity: 0.8; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 12px; margin: 16px 0;
          }
          .card {
            background: var(--card-bg); border-radius: var(--radius);
            padding: 12px; text-align: center; cursor: pointer;
          }
          .card-locked { background: var(--card-locked); }
          .card .emoji { font-size: 2.5rem; display: block; margin-bottom: 4px; }
          .card .word { font-size: 0.9rem; }
          .input-area {
            background: white; border-radius: var(--radius);
            padding: 24px; margin: 16px 0; text-align: center;
          }
          input[type="text"] {
            font-size: 1.5rem; padding: 12px 16px; border: 2px solid #ddd;
            border-radius: var(--radius); width: 100%; text-align: center;
            font-family: inherit;
          }
          input[type="text"]:focus { outline: none; border-color: var(--accent); }
          .result {
            background: var(--card-bg); border-radius: var(--radius);
            padding: 24px; margin: 16px 0; text-align: center;
          }
          .result .emoji { font-size: 5rem; display: block; margin-bottom: 12px; }
          .result .word { font-size: 1.8rem; margin-bottom: 8px; }
          .result .desc { font-size: 1rem; color: #555; line-height: 1.6; }
          .category-header {
            display: flex; align-items: center; gap: 8px;
            margin: 20px 0 8px; font-size: 1.1rem;
          }
          .category-header .count { color: #999; font-size: 0.9rem; }
          .loading { text-align: center; padding: 32px; font-size: 1.2rem; }
          .badge {
            display: inline-block; background: var(--accent); color: white;
            padding: 2px 8px; border-radius: 8px; font-size: 0.75rem;
          }
          nav { display: flex; gap: 8px; margin-bottom: 16px; }
          nav a {
            flex: 1; text-align: center; padding: 10px; border-radius: var(--radius);
            text-decoration: none; color: var(--text); background: var(--card-bg);
          }
          nav a.active { background: var(--accent); color: white; }
          .error { color: #e55; text-align: center; padding: 16px; }
        `}</style>
      </head>
      <body>
        <div class="container">
          {children}
        </div>
      </body>
    </html>
  );
};
