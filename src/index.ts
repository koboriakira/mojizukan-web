import { Hono } from "hono";
import { cors } from "hono/cors";
import { entries } from "./routes/entries";

export type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", cors());

app.get("/", (c) => {
  return c.json({ name: "mojizukan-web", version: "0.1.0" });
});

app.route("/api/entries", entries);

export default app;
