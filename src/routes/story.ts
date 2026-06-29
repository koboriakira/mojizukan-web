import { Hono } from "hono";
import type { AppEnv, StoryRequest, StoryResponse, StoryPage } from "../types";
import { AppError } from "../middleware/error-handler";
import { generateJsonOpenAI, extractJson } from "../lib/ai";

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

  const result = await generateJsonOpenAI<StoryResponse>({
    apiKey: c.env.OPENAI_API_KEY,
    prompt,
  });
  return c.json(result);
});

story.post("/stream", async (c) => {
  const body = await c.req.json<StoryRequest>();

  if (!Array.isArray(body.words) || body.words.length < 2 || body.words.length > 5) {
    throw new AppError(400, "words は 2〜5 個の配列で指定してください");
  }

  const prompt = buildStoryPrompt(body.words) +
    "\n\nJSONのみを出力してください。コードブロックや説明文は不要です。";

  const messages = [{ role: "user" as const, content: prompt }];
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages,
      max_completion_tokens: 2048,
      stream: true,
      response_format: { type: "json_object" },
    }),
  });

  if (!openaiRes.ok || !openaiRes.body) {
    const errBody = await openaiRes.text().catch(() => "");
    console.error(`OpenAI API error (${openaiRes.status}):`, errBody);
    throw new AppError(502, "OpenAI APIへの接続に失敗しました");
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (event: string, data: unknown) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  (async () => {
    let sseBuf = "";
    let responseBuf = "";
    let sentPages = 0;
    const reader = openaiRes.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = typeof value === "string" ? value : decoder.decode(value, { stream: true });
        sseBuf += chunk;

        const lines = sseBuf.split("\n");
        sseBuf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              responseBuf += delta;
            }
          } catch { /* incomplete SSE line */ }
        }

        while (sentPages < 3) {
          const page = tryExtractPage(responseBuf, sentPages);
          if (!page) break;
          await sendEvent("page", page);
          sentPages++;
        }
      }

      if (sentPages < 3) {
        try {
          const full = extractJson<StoryResponse>(responseBuf);
          for (let i = sentPages; i < full.pages.length; i++) {
            await sendEvent("page", full.pages[i]);
          }
        } catch {
          if (sentPages === 0) {
            await sendEvent("error", { message: "おはなしを つくれませんでした" });
          }
        }
      }
      await sendEvent("done", {});
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

function tryExtractPage(text: string, pageIndex: number): StoryPage | null {
  try {
    const full = extractJson<StoryResponse>(text);
    if (full.pages && full.pages[pageIndex]) {
      return full.pages[pageIndex];
    }
  } catch { /* JSON not yet complete */ }
  return null;
}
