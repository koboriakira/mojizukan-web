import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getAllPresets, getPresetsByCategory } from "../lib/preset-dictionary";
import { CATEGORIES } from "../types";

export const presets = new Hono<AppEnv>();

presets.get("/", (c) => {
  const category = c.req.query("category");
  if (category) {
    const words = getPresetsByCategory(category as any);
    return c.json(words);
  }
  return c.json(getAllPresets());
});

presets.get("/categories", (c) => {
  return c.json(CATEGORIES);
});
