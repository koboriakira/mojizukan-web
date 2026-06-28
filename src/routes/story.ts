import { Hono } from "hono";
import type { AppEnv, StoryRequest, StoryResponse } from "../types";
import { AppError } from "../middleware/error-handler";

export const story = new Hono<AppEnv>();

export function buildStoryPrompt(words: string[]): string {
  const wordList = words.join("、");
  return `以下の言葉をすべて使って、3〜4歳の子ども向けの短いおはなしを3ページ分作ってください。
言葉: ${wordList}

ルール:
- ひらがなを中心に、やさしい言葉を使う
- 各ページは1〜2文程度
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

  const prompt = buildStoryPrompt(body.words);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI API error:", response.status, text);
    throw new AppError(502, "おはなしの生成に失敗しました");
  }

  const data = await response.json<{ choices: { message: { content: string } }[] }>();
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new AppError(502, "おはなしの生成に失敗しました");
  }

  const story = JSON.parse(content) as StoryResponse;
  return c.json(story);
});
