// eslint-disable-next-line no-undef
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "node serve.js",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

