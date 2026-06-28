import { Hono } from "hono";
import type { AppEnv, StoryRequest, StoryResponse } from "../types";
import { AppError } from "../middleware/error-handler";
import { generateJson } from "../lib/ai";

export const story = new Hono<AppEnv>();

export function buildStoryPrompt(words: string[]): string {
  const wordList = words.join("、");
  return `以下の言葉を使って、3〜4歳の子ども向けの短いおはなしを3ページ分作ってください。
言葉: ${wordList}

【物語構造】
- 1ページ目: 導入（主人公と場面の紹介）
- 2ページ目: 展開（困りごとやドキドキする出来事）
- 3ページ目: 解決（ハッピーエンド）

【主人公】
- 上記の言葉の中から1つを主人公にする（例: 「ねこ」が主人公なら「ねこのみーちゃんは…」のように呼ぶ）

【感情】
- 各ページに感情（うれしい、びっくり、ほっとした、わくわく、など）を1つ自然に入れる

【言葉の使い方】
- 言葉を無理に散りばめるのではなく、物語の核として組み込む
- 使えた言葉だけ使えばよい（全部使う必要はない）

【文体・長さ】
- ひらがなを中心に、やさしい言葉を使う
- 各ページは1〜2文程度

【JSON出力ルール】
- 各ページに「hero」として挿絵に使う言葉を1つ配列で指定する（上記の言葉から選ぶ）
- 本文は「tokens」配列に分解する:
  - 普通のテキストは {"t":"text","s":"テキスト内容"}
  - 上記の指定された言葉が本文に出てきたら {"t":"word","w":"その言葉"} にする
  - テキストの区切りは自然な読点・句点・スペースの単位で分割する

出力はJSON形式のみで返し、以下の構造にすること:
{"pages":[{"hero":["言葉"],"tokens":[{"t":"text","s":"..."},{"t":"word","w":"..."},...]},...]}`
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
