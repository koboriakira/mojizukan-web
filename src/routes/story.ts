import { Hono } from "hono";
import type { AppEnv } from "../types";
import type { StoryRequest, StoryResponse, StoryPage } from "../services/ohanashi/types";
import { AppError } from "../middleware/error-handler";
import { generateJsonOpenAI, extractJson } from "../services/ai-generation/ai";
import { buildStoryPrompt } from "../services/ohanashi/story-prompt";

export const story = new Hono<AppEnv>();

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
      model: "gpt-5.4",
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
