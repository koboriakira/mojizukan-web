import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getAllDictionaryWords, getDictionaryWordsByCategory } from "../lib/word-dictionary";
import { CATEGORIES } from "../types";

export const dictionary = new Hono<AppEnv>();

dictionary.get("/", (c) => {
  const category = c.req.query("category");
  if (category) {
    const words = getDictionaryWordsByCategory(category as any);
    return c.json(words);
  }
  return c.json(getAllDictionaryWords());
});

dictionary.get("/categories", (c) => {
  return c.json(CATEGORIES);
});
