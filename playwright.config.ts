import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:4173",
    // Use a preinstalled Chromium when CHROMIUM_PATH is set (e.g. in sandboxes).
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    port: 4173,
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
