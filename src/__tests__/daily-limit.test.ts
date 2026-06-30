import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDailyHakkenMax, setDailyHakkenMax, getDailyHakkenUsed, incrementDailyHakkenUsed, canHakkenToday } from "../services/kotoba-atsume/daily-limit";

interface SettingsRow {
  id: string;
  daily_hakken_max: number | null;
}

interface UsageRow {
  user_id: string;
  date: string;
  count: number;
}

function createMockD1(): D1Database {
  const settings: SettingsRow[] = [
    { id: "user-1", daily_hakken_max: null },
  ];
  const usage: UsageRow[] = [];

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async <T = unknown>(): Promise<T | null> => {
          if (/daily_hakken_max.*user_settings/.test(sql)) {
            const [userId] = args as [string];
            const row = settings.find(s => s.id === userId);
            return (row ? { daily_hakken_max: row.daily_hakken_max } : null) as T | null;
          }
          if (/daily_hakken_usage/.test(sql) && /SELECT/.test(sql)) {
            const [userId, date] = args as [string, string];
            const row = usage.find(u => u.user_id === userId && u.date === date);
            return (row ? { count: row.count } : null) as T | null;
          }
          return null;
        },
        run: async (): Promise<D1Result> => {
          if (/UPDATE.*user_settings.*daily_hakken_max/.test(sql)) {
            const [max, userId] = args as [number, string];
            const row = settings.find(s => s.id === userId);
            if (row) row.daily_hakken_max = max;
          }
          if (/INSERT.*daily_hakken_usage/.test(sql)) {
            const [userId, date] = args as [string, string];
            const existing = usage.find(u => u.user_id === userId && u.date === date);
            if (existing) {
              existing.count++;
            } else {
              usage.push({ user_id: userId, date, count: 1 });
            }
          }
          return { success: true, meta: {} as D1Result["meta"], results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("たんけん日次回数制限", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createMockD1();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getDailyHakkenMax", () => {
    it("未設定ならデフォルト値 3 を返す", async () => {
      const max = await getDailyHakkenMax(db, "user-1");
      expect(max).toBe(3);
    });
  });

  describe("setDailyHakkenMax", () => {
    it("0〜9 の範囲で設定できる", async () => {
      await setDailyHakkenMax(db, "user-1", 5);
      const max = await getDailyHakkenMax(db, "user-1");
      expect(max).toBe(5);
    });

    it("範囲外の値はエラーになる", async () => {
      await expect(setDailyHakkenMax(db, "user-1", 10)).rejects.toThrow("0〜9");
      await expect(setDailyHakkenMax(db, "user-1", -1)).rejects.toThrow("0〜9");
    });
  });

  describe("getDailyHakkenUsed", () => {
    it("未使用なら 0 を返す", async () => {
      const used = await getDailyHakkenUsed(db, "user-1");
      expect(used).toBe(0);
    });
  });

  describe("incrementDailyHakkenUsed", () => {
    it("使用回数をインクリメントする", async () => {
      await incrementDailyHakkenUsed(db, "user-1");
      const used = await getDailyHakkenUsed(db, "user-1");
      expect(used).toBe(1);
    });

    it("複数回インクリメントできる", async () => {
      await incrementDailyHakkenUsed(db, "user-1");
      await incrementDailyHakkenUsed(db, "user-1");
      const used = await getDailyHakkenUsed(db, "user-1");
      expect(used).toBe(2);
    });
  });

  describe("canHakkenToday", () => {
    it("使用回数が上限未満なら true", async () => {
      const can = await canHakkenToday(db, "user-1");
      expect(can).toBe(true);
    });

    it("使用回数が上限に達したら false", async () => {
      await incrementDailyHakkenUsed(db, "user-1");
      await incrementDailyHakkenUsed(db, "user-1");
      await incrementDailyHakkenUsed(db, "user-1");
      const can = await canHakkenToday(db, "user-1");
      expect(can).toBe(false);
    });

    it("上限を 0 に設定するとたんけん不可", async () => {
      await setDailyHakkenMax(db, "user-1", 0);
      const can = await canHakkenToday(db, "user-1");
      expect(can).toBe(false);
    });
  });
});
