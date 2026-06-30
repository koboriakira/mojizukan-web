import { describe, it, expect, beforeEach } from "vitest";
import { getCache, setCache } from "../services/ai-generation/shared-cache";

interface CacheRow {
  image_url: string;
  description: string;
}

function createMockD1(): D1Database {
  const store = new Map<string, CacheRow>();

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async <T = unknown>(): Promise<T | null> => {
          if (/SELECT/.test(sql)) {
            const [word, style] = args as [string, string];
            const row = store.get(`${word}:${style}`);
            return (row ?? null) as T | null;
          }
          return null;
        },
        run: async (): Promise<D1Result> => {
          if (/INSERT OR REPLACE/.test(sql)) {
            const [word, style, image_url, description] = args as [string, string, string, string];
            store.set(`${word}:${style}`, { image_url, description });
          }
          return { success: true, meta: {} as D1Result["meta"], results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("shared-cache", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createMockD1();
  });

  it("キャッシュが存在しない場合は null を返す", async () => {
    const result = await getCache(db, "ねこ", "ehon");
    expect(result).toBeNull();
  });

  it("setCache 後に getCache でキャッシュデータを取得できる", async () => {
    await setCache(db, "ねこ", "ehon", "shared/ehon/ねこ.png", "ねこは にゃあと なくよ。");
    const result = await getCache(db, "ねこ", "ehon");
    expect(result).not.toBeNull();
    expect(result?.image_url).toBe("shared/ehon/ねこ.png");
    expect(result?.description).toBe("ねこは にゃあと なくよ。");
  });

  it("同じ word+style の重複 setCache がエラーにならない（UPSERT）", async () => {
    await setCache(db, "いぬ", "pop", "shared/pop/いぬ.png", "いぬは わんわん なくよ。");
    await expect(
      setCache(db, "いぬ", "pop", "shared/pop/いぬ.png", "いぬは げんきに はしるよ。")
    ).resolves.not.toThrow();
  });

  it("word が同じでも style が異なれば別エントリになる", async () => {
    await setCache(db, "ねこ", "ehon", "shared/ehon/ねこ.png", "えほん の ねこ。");
    await setCache(db, "ねこ", "pop", "shared/pop/ねこ.png", "ぽっぷ の ねこ。");

    const ehon = await getCache(db, "ねこ", "ehon");
    const pop = await getCache(db, "ねこ", "pop");

    expect(ehon?.description).toBe("えほん の ねこ。");
    expect(pop?.description).toBe("ぽっぷ の ねこ。");
  });
});
