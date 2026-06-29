import { Hono } from "hono";
import type { AppEnv } from "../types";

export const images = new Hono<AppEnv>();

images.get("/*", async (c) => {
  const key = c.req.path.replace("/api/images/", "");
  if (!key) {
    return c.notFound();
  }

  const object = await c.env.IMAGES.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "image/png");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});
