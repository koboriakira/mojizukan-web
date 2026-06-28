import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "staging-*.spec.ts",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL:
      process.env.STAGING_URL ||
      "https://mojizukan-web.private-beats.workers.dev",
    headless: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
