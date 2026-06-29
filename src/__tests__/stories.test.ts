import { describe, it, expect } from "vitest";
import { validateWords } from "../routes/stories";

describe("validateWords", () => {
  it("2個の配列は有効", () => {
    expect(validateWords(["りんご", "ねこ"])).toBe(true);
  });

  it("5個の配列は有効", () => {
    expect(validateWords(["a", "b", "c", "d", "e"])).toBe(true);
  });

  it("1個の配列は無効", () => {
    expect(validateWords(["りんご"])).toBe(false);
  });

  it("6個の配列は無効", () => {
    expect(validateWords(["a", "b", "c", "d", "e", "f"])).toBe(false);
  });

  it("配列でないものは無効", () => {
    expect(validateWords("りんご")).toBe(false);
    expect(validateWords(null)).toBe(false);
    expect(validateWords(undefined)).toBe(false);
    expect(validateWords(42)).toBe(false);
  });

  it("空の配列は無効", () => {
    expect(validateWords([])).toBe(false);
  });
});
