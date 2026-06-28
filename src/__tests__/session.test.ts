import { describe, it, expect } from "vitest";
import { generateToken, SESSION_MAX_AGE_SEC } from "../lib/session";

describe("session", () => {
  it("generateToken が32バイトの hex 文字列を返す", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generateToken が毎回異なるトークンを返す", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });

  it("SESSION_MAX_AGE_SEC が 30 日", () => {
    expect(SESSION_MAX_AGE_SEC).toBe(30 * 24 * 60 * 60);
  });
});
