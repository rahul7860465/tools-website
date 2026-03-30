const { test, expect } = require("@playwright/test");

const tools = [
  // Homepage uses relative links (./tools/...), but navigation still resolves correctly.
  { name: "JSON Formatter", url: "./tools/json-formatter/index.html" },
  { name: "Base64 Encoder/Decoder", url: "./tools/base64-encoder/index.html" },
  { name: "Password Generator", url: "./tools/password-generator/index.html" },
  { name: "UUID Generator", url: "./tools/uuid-generator/index.html" },
  { name: "URL Encode/Decode", url: "./tools/url-encoder-decoder/index.html" },
  { name: "Text Case Converter", url: "./tools/text-case-converter/index.html" },
  { name: "Regex Tester", url: "./tools/regex-tester/index.html" },
  { name: "JWT Decoder", url: "./tools/jwt-decoder/index.html" },
  { name: "Timestamp Converter", url: "./tools/timestamp-converter/index.html" },
  { name: "HTML Minifier", url: "./tools/html-minifier/index.html" },
];

test.describe("QA: navigation + console health", () => {
  test("Homepage links navigate to tool pages", async ({ page }) => {
    await page.goto("/index.html");

    for (const t of tools) {
      const link = page.locator(`#tool-grid a.card[href="${t.url}"]`);
      await expect(link, `Missing homepage card link for ${t.name}`).toHaveCount(1);
    }
  });

  for (const t of tools) {
    test(`${t.name}: no console errors on load`, async ({ page }) => {
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(t.url.replace(/^\.\//, "/"));

      // Allow lazy tool module to load.
      await page.waitForTimeout(500);

      // Ignore known noisy browser errors (none expected).
      const filtered = errors.filter(Boolean);
      expect(filtered, `Console errors on ${t.url}:\n${filtered.join("\n")}`).toEqual([]);
    });
  }
});

