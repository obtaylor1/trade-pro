import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5001",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command: "PORT=5001 npm run dev",
    url: "http://127.0.0.1:5001/login",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
