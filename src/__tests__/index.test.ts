import { describe, it, expect } from "vitest";
import { app } from "../index";

describe("GET /", () => {
  it("Content-Type が text/html である", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
  });

  it("HTML シェルを返す", async () => {
    const res = await app.request("/");
    const text = await res.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain('<div id="app">');
  });
});
