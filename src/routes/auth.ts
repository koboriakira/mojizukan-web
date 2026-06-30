import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "../types";
import { hashPassword, verifyPassword } from "../services/account/password";
import { createSession, deleteSession, SESSION_MAX_AGE_SEC } from "../services/account/session";
import { getTicketBalance, grantTicket, SIGNUP_BONUS_TICKETS } from "../services/account/tickets";

const auth = new Hono<AppEnv>();

function setSessionCookie(c: any, token: string) {
  setCookie(c, "session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

auth.post("/signup", async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM auth_users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first();
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await c.env.DB.prepare(
    "INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)"
  )
    .bind(id, email.toLowerCase(), passwordHash)
    .run();

  await grantTicket(c.env.DB, id, SIGNUP_BONUS_TICKETS, "登録ボーナス");

  const token = await createSession(c.env.DB, id);
  setSessionCookie(c, token);
  return c.json({ id, email: email.toLowerCase(), tickets: SIGNUP_BONUS_TICKETS }, 201);
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, password_hash FROM auth_users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first<{ id: string; password_hash: string | null }>();
  if (!user || !user.password_hash) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await createSession(c.env.DB, user.id);
  setSessionCookie(c, token);
  const tickets = await getTicketBalance(c.env.DB, user.id);
  return c.json({ id: user.id, email: email.toLowerCase(), tickets });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, "session");
  if (token) {
    await deleteSession(c.env.DB, token);
  }
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const token = getCookie(c, "session");
  if (!token) {
    return c.json({ authed: false });
  }
  const { getSession } = await import("../services/account/session");
  const session = await getSession(c.env.DB, token);
  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ authed: false });
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email FROM auth_users WHERE id = ?"
  )
    .bind(session.userId)
    .first<{ id: string; email: string }>();
  if (!user) {
    return c.json({ authed: false });
  }
  const tickets = await getTicketBalance(c.env.DB, user.id);
  const settings = await c.env.DB.prepare(
    "SELECT image_style FROM user_settings WHERE id = ?"
  ).bind(user.id).first<{ image_style: string }>();
  return c.json({ authed: true, id: user.id, email: user.email, tickets, image_style: settings?.image_style || "ehon" });
});

// --- Google OAuth ---

function googleAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

auth.get("/google", async (c) => {
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const redirectUri = new URL("/api/auth/google/callback", c.req.url).toString();
  return c.redirect(googleAuthorizeUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state));
});

auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state", { path: "/" });

  if (!code || !state || state !== savedState) {
    return c.redirect("/?error=oauth_failed");
  }

  const redirectUri = new URL("/api/auth/google/callback", c.req.url).toString();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return c.redirect("/?error=oauth_failed");
  }

  const tokenData = await tokenRes.json<{
    access_token: string;
    id_token?: string;
  }>();

  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );
  if (!userInfoRes.ok) {
    return c.redirect("/?error=oauth_failed");
  }
  const userInfo = await userInfoRes.json<{
    sub: string;
    email: string;
    name?: string;
  }>();

  let user = await c.env.DB.prepare(
    "SELECT id FROM auth_users WHERE google_sub = ?"
  )
    .bind(userInfo.sub)
    .first<{ id: string }>();

  if (!user) {
    const emailUser = await c.env.DB.prepare(
      "SELECT id FROM auth_users WHERE email = ?"
    )
      .bind(userInfo.email.toLowerCase())
      .first<{ id: string }>();

    if (emailUser) {
      await c.env.DB.prepare(
        "UPDATE auth_users SET google_sub = ? WHERE id = ?"
      )
        .bind(userInfo.sub, emailUser.id)
        .run();
      user = emailUser;
    } else {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        "INSERT INTO auth_users (id, email, google_sub) VALUES (?, ?, ?)"
      )
        .bind(id, userInfo.email.toLowerCase(), userInfo.sub)
        .run();
      await grantTicket(c.env.DB, id, SIGNUP_BONUS_TICKETS, "登録ボーナス");
      user = { id };
    }
  }

  const sessionToken = await createSession(c.env.DB, user.id);
  setSessionCookie(c, sessionToken);
  return c.redirect("/");
});

export default auth;
