import { describe, it, expect, beforeEach } from "vitest";
import { getRandomWords } from "../routes/hakken";
import { addPreparedWord, listPreparedWords, removePreparedWord } from "../services/kotoba-atsume/prepared-words";

const SAMPLE_WORDS = ["らいおん", "ぺんぎん", "いるか", "くじら", "かめ"];

interface PreparedRow {
  id: number;
  user_id: string;
  word: string;
  created_at: string;
}

function createMockD1(): D1Database & { _store: PreparedRow[] } {
  const store: PreparedRow[] = [];
  let nextId = 1;

  return {
    _store: store,
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async <T = unknown>(): Promise<T | null> => {
          if (/SELECT.*prepared_words.*WHERE.*user_id.*AND.*word/.test(sql)) {
            const [userId, word] = args as [string, string];
            const row = store.find(r => r.user_id === userId && r.word === word);
            return (row ?? null) as T | null;
          }
          return null;
        },
        all: async () => {
          if (/SELECT.*prepared_words.*WHERE.*user_id/.test(sql)) {
            const [userId] = args as [string];
            return { results: store.filter(r => r.user_id === userId) };
          }
          return { results: [] };
        },
        run: async (): Promise<D1Result> => {
          if (/INSERT/.test(sql)) {
            const [userId, word] = args as [string, string];
            store.push({ id: nextId++, user_id: userId, word, created_at: new Date().toISOString() });
          }
          if (/DELETE/.test(sql)) {
            const [userId, word] = args as [string, string];
            const idx = store.findIndex(r => r.user_id === userId && r.word === word);
            if (idx >= 0) store.splice(idx, 1);
          }
          return { success: true, meta: {} as D1Result["meta"], results: [] };
        },
      }),
    }),
  } as unknown as D1Database & { _store: PreparedRow[] };
}

describe("ひみつのことば（prepared）管理", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createMockD1();
  });

  describe("addPreparedWord", () => {
    it("言葉を仕込める", async () => {
      await addPreparedWord(db, "user-1", "ぺんぎん");
      const words = await listPreparedWords(db, "user-1");
      expect(words).toContain("ぺんぎん");
    });

    it("同じ言葉の重複仕込みはエラーになる", async () => {
      await addPreparedWord(db, "user-1", "ぺんぎん");
      await expect(addPreparedWord(db, "user-1", "ぺんぎん")).rejects.toThrow("既に仕込み済み");
    });
  });

  describe("listPreparedWords", () => {
    it("仕込み済み一覧を取得できる", async () => {
      await addPreparedWord(db, "user-1", "ぺんぎん");
      await addPreparedWord(db, "user-1", "きりん");
      const words = await listPreparedWords(db, "user-1");
      expect(words).toEqual(expect.arrayContaining(["ぺんぎん", "きりん"]));
      expect(words).toHaveLength(2);
    });

    it("他ユーザーの仕込みは含まれない", async () => {
      await addPreparedWord(db, "user-1", "ぺんぎん");
      await addPreparedWord(db, "user-2", "きりん");
      const words = await listPreparedWords(db, "user-1");
      expect(words).toEqual(["ぺんぎん"]);
    });
  });

  describe("removePreparedWord", () => {
    it("仕込みを取り消せる", async () => {
      await addPreparedWord(db, "user-1", "ぺんぎん");
      await removePreparedWord(db, "user-1", "ぺんぎん");
      const words = await listPreparedWords(db, "user-1");
      expect(words).not.toContain("ぺんぎん");
    });
  });

  describe("getRandomWords - prepared 優先", () => {
    it("prepared words を優先的に返す", () => {
      const prepared = SAMPLE_WORDS.slice(0, 2);
      const result = getRandomWords({ n: 3, collected: SAMPLE_WORDS.slice(2), prepared });
      for (const p of prepared) {
        expect(result.words).toContain(p);
      }
    });

    it("prepared が n 個未満なら collected から補完する", () => {
      const prepared = [SAMPLE_WORDS[0]];
      const collected = SAMPLE_WORDS.slice(1);
      const result = getRandomWords({ n: 3, collected, prepared });
      expect(result.words).toHaveLength(3);
      expect(result.words).toContain(prepared[0]);
    });

    it("collected 済みの prepared は除外する", () => {
      // n を uncollectedPrepared 数以下にして review 補完が発生しないシナリオ
      const prepared = SAMPLE_WORDS.slice(0, 3);
      const collected = [prepared[0]];
      const result = getRandomWords({ n: 2, collected, prepared });
      expect(result.words).not.toContain(prepared[0]);
      expect(result.words).toHaveLength(2);
    });

    it("prepared が n 個以上なら prepared から n 個返す", () => {
      const prepared = SAMPLE_WORDS.slice(0, 5);
      const result = getRandomWords({ n: 3, collected: [], prepared });
      expect(result.words).toHaveLength(3);
      for (const w of result.words) {
        expect(prepared).toContain(w);
      }
    });
  });
});
