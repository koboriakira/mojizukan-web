import { describe, it, expect } from "vitest";
import { app } from "../index";
import type { Bindings } from "../types";

interface HakkenEntryRow {
  user_id: string;
  word: string;
  description: string;
  image_url: string;
}

interface MockD1Options {
  sessions?: Record<string, string>; // token -> userId
  sharedCache?: Record<string, { image_url: string; description: string }>; // `${word}:${style}`
}

function createMockD1(options: MockD1Options = {}) {
  const sessions = options.sessions ?? {};
  const sharedCache = options.sharedCache ?? {};
  const hakkenEntries: HakkenEntryRow[] = [];

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
              if (sql.includes("FROM shared_cache")) {
                const [word, style] = args as [string, string];
                const row = sharedCache[`${word}:${style}`];
                return (row ?? null) as T | null;
              }
              return null;
            },
            async run(): Promise<D1Result> {
              if (sql.includes("INSERT OR IGNORE INTO hakken_entries")) {
                const [userId, word, description, image_url] = args as [string, string, string, string];
                // UNIQUE(user_id, word) を模す: 既存があれば無視する（実DBの OR IGNORE と同じ挙動）
                const exists = hakkenEntries.some((e) => e.user_id === userId && e.word === word);
                if (!exists) {
                  hakkenEntries.push({ user_id: userId, word, description, image_url });
                }
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

  return { db: db as unknown as D1Database, hakkenEntries };
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

function postMerge(db: D1Database, words: string[], cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return app.request(
    "/api/hakken/merge-guest-entries",
    { method: "POST", headers, body: JSON.stringify({ words }) },
    buildEnv(db),
  );
}

describe("POST /api/hakken/merge-guest-entries", () => {
  it("認証なしでは 401 を返す", async () => {
    const { db } = createMockD1();
    const res = await postMerge(db, ["いぬ"]);
    expect(res.status).toBe(401);
  });

  it("AC-001: おためしことば許可リストの語はキャッシュ内容ごと hakken_entries に永続化される", async () => {
    const { db, hakkenEntries } = createMockD1({
      sessions: { "valid-token": "user-1" },
      sharedCache: {
        "いぬ:ehon": { image_url: "/images/cache/ehon_いぬ.webp", description: "しっぽを ふって よろこぶよ。" },
      },
    });

    const res = await postMerge(db, ["いぬ"], "session=valid-token");

    expect(res.status).toBe(200);
    const json = await res.json() as { merged: string[] };
    expect(json.merged).toEqual(["いぬ"]);
    expect(hakkenEntries).toEqual([
      { user_id: "user-1", word: "いぬ", description: "しっぽを ふって よろこぶよ。", image_url: "/images/cache/ehon_いぬ.webp" },
    ]);
  });

  it("AC-003: 許可リスト外の語は棄却されサーバーに保存されない", async () => {
    const { db, hakkenEntries } = createMockD1({
      sessions: { "valid-token": "user-1" },
      sharedCache: {
        "いぬ:ehon": { image_url: "/images/cache/ehon_いぬ.webp", description: "しっぽを ふって よろこぶよ。" },
      },
    });

    const res = await postMerge(db, ["いぬ", "らいおん", "ちんこ"], "session=valid-token");

    expect(res.status).toBe(200);
    const json = await res.json() as { merged: string[] };
    expect(json.merged).toEqual(["いぬ"]);
    expect(hakkenEntries).toHaveLength(1);
    expect(hakkenEntries[0].word).toBe("いぬ");
  });

  it("許可リストにあってもキャッシュ未投入の語はマージされない", async () => {
    const { db, hakkenEntries } = createMockD1({
      sessions: { "valid-token": "user-1" },
      sharedCache: {},
    });

    const res = await postMerge(db, ["うま"], "session=valid-token");

    expect(res.status).toBe(200);
    const json = await res.json() as { merged: string[] };
    expect(json.merged).toEqual([]);
    expect(hakkenEntries).toHaveLength(0);
  });

  it("マージは冪等: 同じ語を二重にマージしてもエラーにならず重複登録されない", async () => {
    const { db, hakkenEntries } = createMockD1({
      sessions: { "valid-token": "user-1" },
      sharedCache: {
        "ねこ:ehon": { image_url: "/images/cache/ehon_ねこ.webp", description: "ふわふわの けがわが きもちいいよ。" },
      },
    });

    await postMerge(db, ["ねこ"], "session=valid-token");
    const res = await postMerge(db, ["ねこ"], "session=valid-token");

    expect(res.status).toBe(200);
    const json = await res.json() as { merged: string[] };
    expect(json.merged).toEqual(["ねこ"]);
    expect(hakkenEntries).toHaveLength(1);
  });

  it("空配列を渡すと merged: [] を返し何も保存しない", async () => {
    const { db, hakkenEntries } = createMockD1({
      sessions: { "valid-token": "user-1" },
    });

    const res = await postMerge(db, [], "session=valid-token");

    expect(res.status).toBe(200);
    const json = await res.json() as { merged: string[] };
    expect(json.merged).toEqual([]);
    expect(hakkenEntries).toHaveLength(0);
  });
});
