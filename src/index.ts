import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { errorHandler } from "./middleware/error-handler";
import { entries } from "./routes/entries";
import { presets } from "./routes/presets";
import { styles } from "./routes/styles";
import { buildShell } from "./client/shell";

const app = new Hono<AppEnv>();

app.use("/*", cors());
app.onError(errorHandler);

app.get("/", (c) => {
  return c.html(buildShell());
});

app.route("/api/entries", entries);
app.route("/api/presets", presets);
app.route("/api/styles", styles);

export default app;
