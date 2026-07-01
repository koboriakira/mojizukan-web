import { describe, it, expect } from "vitest";
import { app } from "../index";
import type { Bindings } from "../types";

interface HakkenEntryRow {
  user_id: string;
  word: string;
  description: string;
  image_url: string;
}

interface TicketRow {
  user_id: string;
  amount: number;
}

interface MockD1Options {
  sessions?: Record<string, string>; // token -> userId
  sharedCache?: Record<string, { image_url: string; description: string }>; // `${word}:${style}`
  userSettings?: Record<string, string>; // userId -> image_style
}

function createMockD1(options: MockD1Options = {}) {
  const sessions = options.sessions ?? {};
  const sharedCache = options.sharedCache ?? {};
  const userSettings = options.userSettings ?? {};
  const hakkenEntries: HakkenEntryRow[] = [];
  const tickets: TicketRow[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T = unknown>(): Promise<T | null> {
              if (sql.includes("FROM sessions")) {
                const [token] = args as [string];
                const userId = sessions[token];
                return (userId ? { user_id: userId } : null) as T | null;
              }
              if (sql.includes("SELECT word FROM hakken_entries")) {
                const [userId, word] = args as [string, string];
                const row = hakkenEntries.find((e) => e.user_id === userId && e.word === word);
                return (row ? { word: row.word } : null) as T | null;
              }
              if (sql.includes("FROM user_settings")) {
                const [userId] = args as [string];
                const style = userSettings[userId];
                return (style ? { image_style: style } : null) as T | null;
              }
              if (sql.includes("FROM shared_cache")) {
                const [word, style] = args as [string, string];
                const row = sharedCache[`${word}:${style}`];
                return (row ?? null) as T | null;
              }
              if (sql.includes("FROM tickets")) {
                const [userId] = args as [string];
                const balance = tickets
                  .filter((t) => t.user_id === userId)
                  .reduce((sum, t) => sum + t.amount, 0);
                return { balance } as unknown as T;
              }
              return null;
            },
            async run(): Promise<D1Result> {
              if (sql.includes("INSERT OR REPLACE INTO hakken_entries")) {
                const [userId, word, description, image_url] = args as [string, string, string, string];
                const idx = hakkenEntries.findIndex((e) => e.user_id === userId && e.word === word);
                const row: HakkenEntryRow = { user_id: userId, word, description, image_url };
                if (idx >= 0) hakkenEntries[idx] = row;
                else hakkenEntries.push(row);
              }
              if (sql.includes("INSERT INTO tickets")) {
                const [, userId, amount] = args as [string, string, number, string];
                tickets.push({ user_id: userId, amount });
              }
              return { success: true, meta: {} as D1Result["meta"], results: [] };
            },
            async all<T = unknown>(): Promise<D1Result<T>> {
              return { success: true, meta: {} as D1Result["meta"], results: [] };
            },
          };
        },
      };
    },
  };

  return { db: db as unknown as D1Database, hakkenEntries, tickets };
}

function buildEnv(db: D1Database): Bindings {
  return {
    DB: db,
    IMAGES: {} as unknown as R2Bucket,
    AI: {} as unknown as Ai,
    GOOGLE_CLIENT_ID: "dummy",
    GOOGLE_CLIENT_SECRET: "dummy",
    SENTRY_DSN: "",
    OPENAI_API_KEY: "dummy",
  };
}

describe("POST /api/hakken/generate 認証境界", () => {
  it("ゲスト + キャッシュヒット: 200 でイラスト付きレスポンスを返し、hakken_entries には保存しない", async () => {
    const { db, hakkenEntries } = createMockD1({
      sharedCache: {
        "いぬ:ehon": { image_url: "/images/cache/ehon_いぬ.webp", description: "いぬは わんわん なくよ。" },
      },
    });

    const res = await app.request(
      "/api/hakken/generate",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "いぬ" }) },
      buildEnv(db),
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { description: string; image_url: string; cached: boolean };
    expect(json.image_url).toBe("/images/cache/ehon_いぬ.webp");
    expect(json.description).toBe("いぬは わんわん なくよ。");
    expect(json.cached).toBe(true);
    expect(hakkenEntries).toHaveLength(0);
  });

  it("ゲスト + キャッシュミス: 401 を返す", async () => {
    const { db } = createMockD1();

    const res = await app.request(
      "/api/hakken/generate",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "みつからないことば" }) },
      buildEnv(db),
    );

    expect(res.status).toBe(401);
  });

  it("ログイン済み: 従来通りキャッシュヒットで hakken_entries に保存され、チケットは消費されない", async () => {
    const { db, hakkenEntries, tickets } = createMockD1({
      sessions: { "valid-token": "user-1" },
      sharedCache: {
        "ねこ:ehon": { image_url: "/images/cache/ehon_ねこ.webp", description: "ねこは にゃあと なくよ。" },
      },
      userSettings: { "user-1": "ehon" },
    });

    const res = await app.request(
      "/api/hakken/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "session=valid-token" },
        body: JSON.stringify({ word: "ねこ" }),
      },
      buildEnv(db),
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { description: string; image_url: string; cached: boolean };
    expect(json.image_url).toBe("/images/cache/ehon_ねこ.webp");
    expect(json.cached).toBe(true);
    expect(hakkenEntries).toEqual([
      { user_id: "user-1", word: "ねこ", description: "ねこは にゃあと なくよ。", image_url: "/images/cache/ehon_ねこ.webp" },
    ]);
    expect(tickets).toHaveLength(0);
  });
});
