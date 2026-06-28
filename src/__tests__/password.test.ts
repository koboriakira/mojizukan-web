import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";

describe("password", () => {
  it("hashPassword がソルト付きハッシュ文字列を返す", async () => {
    const hash = await hashPassword("test-password");
    expect(hash).toContain(":");
    const [salt, derived] = hash.split(":");
    expect(salt.length).toBeGreaterThan(0);
    expect(derived.length).toBeGreaterThan(0);
  });

  it("同じパスワードでも毎回異なるハッシュを生成する", async () => {
    const h1 = await hashPassword("same-password");
    const h2 = await hashPassword("same-password");
    expect(h1).not.toBe(h2);
  });

  it("正しいパスワードで検証が通る", async () => {
    const hash = await hashPassword("my-secret");
    const ok = await verifyPassword("my-secret", hash);
    expect(ok).toBe(true);
  });

  it("間違ったパスワードで検証が失敗する", async () => {
    const hash = await hashPassword("my-secret");
    const ok = await verifyPassword("wrong-password", hash);
    expect(ok).toBe(false);
  });

  it("空パスワードでも動作する", async () => {
    const hash = await hashPassword("");
    expect(await verifyPassword("", hash)).toBe(true);
    expect(await verifyPassword("notempty", hash)).toBe(false);
  });
});
