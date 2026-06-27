import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getAllStyles } from "../lib/image-styles";

export const styles = new Hono<AppEnv>();

styles.get("/", (c) => {
  return c.json(getAllStyles());
});
