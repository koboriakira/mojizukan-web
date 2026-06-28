import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 15_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8787",
    headless: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npx wrangler dev --port 8787",
    port: 8787,
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
