import { Hono } from "hono";
import { cors } from "hono/cors";
import { withSentry } from "@sentry/cloudflare";
import type { AppEnv, Bindings } from "./types";
import { errorHandler } from "./middleware/error-handler";
import { optionalAuth } from "./middleware/auth";
import { entries } from "./routes/entries";
import { dictionary } from "./routes/dictionary";
import { styles } from "./routes/styles";
import { story } from "./routes/story";
import { hakken } from "./routes/hakken";
import { stories } from "./routes/stories";
import { images } from "./routes/images";
import { dev } from "./routes/dev";
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
app.route("/api/dictionary", dictionary);
app.route("/api/styles", styles);
app.route("/api/story", story);
app.route("/api/hakken", hakken);
app.route("/api/stories", stories);
app.route("/api/images", images);
app.route("/api/dev", dev);

export { app };

export default withSentry<Bindings>(
  (env) => ({
    dsn: env?.SENTRY_DSN ?? "",
    tracesSampleRate: 1.0,
  }),
  app,
);
