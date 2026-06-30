import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import { getSession } from "../services/account/session";
import { getCookie } from "hono/cookie";

export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, "session");
  if (token) {
    const session = await getSession(c.env.DB, token);
    if (session) {
      c.set("userId", session.userId);
    }
  }
  await next();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await getSession(c.env.DB, token);
  if (!session) {
    return c.json({ error: "Session expired" }, 401);
  }
  c.set("userId", session.userId);
  await next();
};
