import { Hono } from "hono";
import type { AppEnv, ImageStyle } from "../types";
import { requireAuth } from "../middleware/auth";
import { getAllStyles, getStyleConfig } from "../lib/image-styles";

const VALID_STYLES: ImageStyle[] = ["honwaka", "ehon", "pop", "watercolor", "zukan"];

export const styles = new Hono<AppEnv>();

styles.get("/", (c) => {
  return c.json(getAllStyles());
});

styles.put("/", requireAuth, async (c) => {
  const body = await c.req.json<{ image_style: string }>();
  if (!body.image_style || !VALID_STYLES.includes(body.image_style as ImageStyle)) {
    return c.json({ error: "無効なスタイルです" }, 400);
  }
  const userId = c.var.userId!;
  await c.env.DB.prepare(
    "UPDATE user_settings SET image_style = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(body.image_style, userId).run();
  return c.json({ image_style: body.image_style, label: getStyleConfig(body.image_style as ImageStyle).label });
});
