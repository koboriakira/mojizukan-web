import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { AppEnv } from "../types";
import { hashPassword } from "../lib/password";
import { createSession, SESSION_MAX_AGE_SEC } from "../lib/session";
import { getTicketBalance, grantTicket } from "../lib/tickets";

export const dev = new Hono<AppEnv>();

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test123456";

dev.get("/auto-login", async (c) => {
  if (!c.env.DEV_LOGIN) {
    return c.json({ error: "Not available" }, 404);
  }

  const ticketCount = parseInt(c.req.query("tickets") || "5", 10);

  let user = await c.env.DB.prepare(
    "SELECT id FROM auth_users WHERE email = ?"
  )
    .bind(TEST_EMAIL)
    .first<{ id: string }>();

  if (!user) {
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(TEST_PASSWORD);
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)"
      ).bind(id, TEST_EMAIL, passwordHash),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO user_settings (id) VALUES (?)"
      ).bind(id),
    ]);
    user = { id };
  }

  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO user_settings (id) VALUES (?)"
  ).bind(user.id).run();

  const balance = await getTicketBalance(c.env.DB, user.id);
  if (balance < ticketCount) {
    await grantTicket(c.env.DB, user.id, ticketCount - balance, "dev-auto-login");
  }

  const token = await createSession(c.env.DB, user.id);
  setCookie(c, "session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  return c.redirect("/");
});

dev.get("/auto-logout", async (c) => {
  if (!c.env.DEV_LOGIN) {
    return c.json({ error: "Not available" }, 404);
  }

  const { deleteCookie } = await import("hono/cookie");
  const { getCookie } = await import("hono/cookie");
  const { deleteSession } = await import("../lib/session");

  const sessionToken = getCookie(c, "session");
  if (sessionToken) {
    await deleteSession(c.env.DB, sessionToken);
  }
  deleteCookie(c, "session", { path: "/" });

  return c.redirect("/");
});
