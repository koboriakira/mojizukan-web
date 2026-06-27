import type { FC } from "hono/jsx";
import { Layout } from "./layout";

export const HomePage: FC = () => {
  return (
    <Layout>
      <h1>📖✏️</h1>
      <h1>もじずかん</h1>
      <a href="/play" class="btn btn-coral">はじめる</a>
      <a href="/zukan" class="btn btn-mint">ずかん</a>
    </Layout>
  );
};
