import { Hono } from "hono";
import type { AppEnv, StoryRequest, StoryResponse } from "../types";
import { AppError } from "../middleware/error-handler";
import { generateJson } from "../lib/ai";

export const story = new Hono<AppEnv>();

export function buildStoryPrompt(words: string[]): string {
  const wordList = words.join("、");
  return `以下の言葉を使って、3〜4歳の子どもが自分で読めるおはなしを3ページ分作ってください。
言葉: ${wordList}

【物語構造】
- 1ページ目: 導入（主人公と場面の紹介。他の言葉も同じ場面に登場させる）
- 2ページ目: 展開（困りごとやドキドキする出来事。言葉同士が関わり合う）
- 3ページ目: 解決（みんなで解決してハッピーエンド）

【言葉の使い方（最重要）】
- 各ページに必ず2つ以上の言葉を同じ場面で一緒に登場させる
- 言葉と言葉の組み合わせが面白くなるように物語を作る（例: 「ねこ」と「でんしゃ」なら、ねこがでんしゃに乗る場面を作る）
- すべての言葉を物語に組み込む

【文体・長さ】
- すべてひらがなで書く
- 各ページは3〜4文、80〜120文字程度
- 子どもが自分で読める、やさしく短い文を連ねる

【JSON出力ルール】
- 各ページに「hero」として挿絵に使う言葉を1〜2個、配列で指定する（上記の言葉から選ぶ）
- 本文は「tokens」配列に分解する:
  - 普通のテキストは {"t":"text","s":"テキスト内容"}
  - 上記の指定された言葉が本文に出てきたら {"t":"word","w":"その言葉"} にする
  - テキストの区切りは自然な読点・句点・スペースの単位で分割する

出力はJSON形式のみで返し、以下の構造にすること:
{"pages":[{"hero":["言葉1","言葉2"],"tokens":[{"t":"text","s":"..."},{"t":"word","w":"..."},...]},...]}`
}

story.post("/", async (c) => {
  const body = await c.req.json<StoryRequest>();

  if (!Array.isArray(body.words) || body.words.length < 2 || body.words.length > 5) {
    throw new AppError(400, "words は 2〜5 個の配列で指定してください");
  }

  const prompt = buildStoryPrompt(body.words) +
    "\n\nJSONのみを出力してください。コードブロックや説明文は不要です。";

  const result = await generateJson<StoryResponse>({
    ai: c.env.AI,
    prompt,
  });
  return c.json(result);
});
