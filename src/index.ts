import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { errorHandler } from "./middleware/error-handler";
import { optionalAuth } from "./middleware/auth";
import { entries } from "./routes/entries";
import { presets } from "./routes/presets";
import { styles } from "./routes/styles";
import { story } from "./routes/story";
import { hakken } from "./routes/hakken";
import auth from "./routes/auth";
import { buildShell } from "./client/shell";

const app = new Hono<AppEnv>();

app.use("/*", cors());
app.use("/api/*", optionalAuth);
app.onError(errorHandler);

app.get("/", (c) => {
  return c.html(buildShell());
});

app.route("/api/auth", auth);
app.route("/api/entries", entries);
app.route("/api/presets", presets);
app.route("/api/styles", styles);
app.route("/api/story", story);
app.route("/api/hakken", hakken);

export default app;
