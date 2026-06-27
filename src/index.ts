import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { errorHandler } from "./middleware/error-handler";
import { entries } from "./routes/entries";
import { presets } from "./routes/presets";
import { styles } from "./routes/styles";
import { pages } from "./routes/pages";

const app = new Hono<AppEnv>();

app.use("/api/*", cors());
app.onError(errorHandler);

app.route("/api/entries", entries);
app.route("/api/presets", presets);
app.route("/api/styles", styles);

app.route("/", pages);

export default app;
