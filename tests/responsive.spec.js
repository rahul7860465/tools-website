const { test, expect } = require("@playwright/test");

const viewports = [
  { name: "320px", viewport: { width: 320, height: 720 } },
  { name: "768px", viewport: { width: 768, height: 720 } },
  { name: "1024px", viewport: { width: 1024, height: 768 } },
];

const pages = [
  { name: "home", url: "/index.html", selectors: ["#tool-search", "#tool-grid"] },
  { name: "json-formatter", url: "/tools/json-formatter/index.html", selectors: ["#input", "#output", "#copy", "#clear"] },
  { name: "base64-encoder", url: "/tools/base64-encoder/index.html", selectors: ["#input", "#outputText", "#copy", "#clear"] },
  { name: "password-generator", url: "/tools/password-generator/index.html", selectors: ["#length", "#generate", "#copy", "#clear"] },
  { name: "uuid-generator", url: "/tools/uuid-generator/index.html", selectors: ["#count", "#generate", "#copy", "#clear"] },
  { name: "url-encoder-decoder", url: "/tools/url-encoder-decoder/index.html", selectors: ["#input", "#outputText", "#copy", "#clear"] },
  { name: "text-case-converter", url: "/tools/text-case-converter/index.html", selectors: ["#input", "#outputText", "#run", "#copy", "#clear"] },
  { name: "regex-tester", url: "/tools/regex-tester/index.html", selectors: ["#pattern", "#flags", "#input", "#run", "#copy", "#clear"] },
  { name: "jwt-decoder", url: "/tools/jwt-decoder/index.html", selectors: ["#input", "#output", "#run", "#copy", "#clear"] },
  { name: "timestamp-converter", url: "/tools/timestamp-converter/index.html", selectors: ["#input", "#output", "#run", "#copy", "#clear"] },
  { name: "html-minifier", url: "/tools/html-minifier/index.html", selectors: ["#input", "#output", "#run", "#copy", "#clear"] },
];

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const d = document.documentElement;
    return {
      clientWidth: d.clientWidth,
      scrollWidth: d.scrollWidth,
      bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
    };
  });

  const worst = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth);
  expect(worst, `${label} has horizontal overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

for (const vp of viewports) {
  test.describe(`responsive @ ${vp.name}`, () => {
    test.use({ viewport: vp.viewport });

    for (const p of pages) {
      test(`${p.name}: loads, controls visible, no overflow`, async ({ page }) => {
        await page.goto(p.url);

        for (const sel of p.selectors) {
          await expect(page.locator(sel), `${p.name} missing ${sel}`).toBeVisible();
        }

        await assertNoHorizontalOverflow(page, `${p.name} @ ${vp.name}`);
      });
    }
  });
}

