const { test, expect } = require("@playwright/test");

function clampErrorMessage(msg) {
  return String(msg ?? "").slice(0, 300);
}

async function stubClipboard(page) {
  await page.addInitScript(() => {
    window.__clipboard = "";

    const writeText = (text) => {
      window.__clipboard = String(text ?? "");
      return Promise.resolve();
    };

    try {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
    } catch (e) {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText = writeText;
      } catch (e2) {
        // ignore
      }
    }
  });
}

async function getClipboard(page) {
  return page.evaluate(() => window.__clipboard);
}

test.describe("Developer tools (browser-only)", () => {
  test("JSON Formatter: load, format, copy, invalid input", async ({ page, baseURL }) => {
    await stubClipboard(page);
    await page.goto("/tools/json-formatter/index.html");

    const input = page.locator("#input");
    const formatBtn = page.locator("#format");
    const output = page.locator("#output");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await expect(input).toBeVisible();
    await expect(output).toBeVisible();

    await input.fill('{"hello":"world"}');
    await formatBtn.click();
    await expect(output).toContainText("hello");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toContain("hello");

    await input.fill("{broken");
    await formatBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("Password Generator: load, generate, copy, invalid input", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/password-generator/index.html");

    const genBtn = page.locator("#generate");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");
    const output = page.locator("#output");

    // Make it deterministic to validate allowed chars: enable only lower + nums.
    await page.locator("#length").fill("12");
    await page.locator("#lower").uncheck();
    await page.locator("#upper").uncheck();
    await page.locator("#nums").check();
    await page.locator("#syms").uncheck();
    await page.locator("#lower").check();

    await genBtn.click();
    const text = await output.textContent();
    expect(text.length).toBe(12);
    expect(/^[a-z0-9]+$/.test(text)).toBeTruthy();

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toMatch(/^[a-z0-9]+$/);

    // Invalid: disable all sets
    await page.locator("#lower").uncheck();
    await page.locator("#nums").uncheck();
    await genBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("Base64 Encoder/Decoder: load, encode, copy, invalid input", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/base64-encoder/index.html");

    const input = page.locator("#input");
    const encodeBtn = page.locator("#encode");
    const decodeBtn = page.locator("#decode");
    const output = page.locator("#outputText");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await input.fill("hello world");
    await encodeBtn.click();
    await expect(output).toHaveValue("aGVsbG8gd29ybGQ=");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toBe("aGVsbG8gd29ybGQ=");

    // Invalid base64
    await input.fill("%");
    await decodeBtn.click();
    await expect(output).toHaveValue("");
    await expect(status).not.toHaveText("");
  });

  test("UUID Generator: load, generate list, copy, invalid count", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/uuid-generator/index.html");

    const count = page.locator("#count");
    const genBtn = page.locator("#generate");
    const copyBtn = page.locator("#copy");
    const downloadBtn = page.locator("#download"); // presence only
    const output = page.locator("#output");
    const status = page.locator("#status");

    await expect(downloadBtn).toBeVisible();

    await count.fill("3");
    await genBtn.click();
    const lines = (await output.textContent()).split("\n").filter(Boolean);
    expect(lines).toHaveLength(3);

    for (const id of lines) {
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).toBeTruthy();
    }

    await copyBtn.click();
    const clip = await getClipboard(page);
    expect(clip.split("\n").filter(Boolean)).toHaveLength(3);

    // Invalid: count=0
    await count.fill("0");
    await genBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("URL Encode/Decode: load, encode, copy, invalid decode", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/url-encoder-decoder/index.html");

    const input = page.locator("#input");
    const output = page.locator("#outputText");
    const encodeBtn = page.locator("#encode");
    const decodeBtn = page.locator("#decode");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await input.fill("a b");
    await encodeBtn.click();
    await expect(output).toHaveValue("a%20b");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toBe("a%20b");

    await input.fill("%");
    await decodeBtn.click();
    await expect(output).toHaveValue("");
    await expect(status).not.toHaveText("");
  });

  test("Text Case Converter: load, convert, copy, invalid input (too large)", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/text-case-converter/index.html");

    const input = page.locator("#input");
    const mode = page.locator("#mode");
    const runBtn = page.locator("#run");
    const output = page.locator("#outputText");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await mode.selectOption("snake");
    await input.fill("Hello World");
    await runBtn.click();
    await expect(output).toHaveValue("hello_world");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toBe("hello_world");

    // Invalid: extremely large input triggers safety cap
    await input.fill("a".repeat(210000));
    await runBtn.click();
    await expect(output).toHaveValue("");
    await expect(status).not.toHaveText("");
  });

  test("Regex Tester: load, run, copy, invalid pattern", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/regex-tester/index.html");

    const pattern = page.locator("#pattern");
    const flags = page.locator("#flags");
    const input = page.locator("#input");
    const runBtn = page.locator("#run");
    const output = page.locator("#output");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await pattern.fill("(\\w+)");
    await flags.fill("g");
    await input.fill("a b");
    await runBtn.click();
    await expect(output).toContainText("match");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toContain("match");

    // Invalid: empty pattern
    await pattern.fill("");
    await runBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("JWT Decoder: load, decode, copy, invalid input", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/jwt-decoder/index.html");

    const input = page.locator("#input");
    const runBtn = page.locator("#run");
    const output = page.locator("#output");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    // Header {} and Payload {} using base64url for "{}" => e30
    await input.fill("e30.e30");
    await runBtn.click();
    await expect(output).toContainText("Header:");
    await expect(output).toContainText("Payload:");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toContain("Header:");

    await input.fill("not-a-jwt");
    await runBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("Timestamp Converter: load, convert, copy, invalid input", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/timestamp-converter/index.html");

    const input = page.locator("#input");
    const runBtn = page.locator("#run");
    const output = page.locator("#output");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await input.fill("1711362000");
    await runBtn.click();
    await expect(output).toContainText("Unix (s):");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toContain("Unix (s):");

    await input.fill("abc");
    await runBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });

  test("HTML Minifier: load, minify, copy, invalid input", async ({ page }) => {
    await stubClipboard(page);
    await page.goto("/tools/html-minifier/index.html");

    const input = page.locator("#input");
    const runBtn = page.locator("#run");
    const output = page.locator("#output");
    const copyBtn = page.locator("#copy");
    const status = page.locator("#status");

    await input.fill("<div>  test </div>");
    await runBtn.click();
    await expect(output).not.toHaveText("");

    await copyBtn.click();
    await expect.poll(() => getClipboard(page)).toContain("div");

    await input.fill("");
    await runBtn.click();
    await expect(output).toHaveText("");
    await expect(status).not.toHaveText("");
  });
});

test.describe("AI workflow flows", () => {
  test("Prompt Generator: share link restores state", async ({ page }) => {
    await page.goto("/tools/prompt-generator/index.html");

    await page.locator("#topic").fill("Landing page");
    await page.locator("#audience").fill("Founders");
    await page.locator("#goal").fill("Write a hero section");
    await page.locator("#tone").selectOption("Technical");

    const shareBtn = page
      .locator('[aria-label="Workflow actions"] button')
      .filter({ hasText: "Share link" })
      .first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toContain("tb_state=");
    const shared = await page.evaluate(() => window.location.href);

    const next = await page.context().newPage();
    await next.goto(shared);
    await expect(next.locator("#topic")).toHaveValue("Landing page");
    await expect(next.locator("#audience")).toHaveValue("Founders");
    await expect(next.locator("#goal")).toHaveValue("Write a hero section");
    await expect(next.locator("#tone")).toHaveValue("Technical");
    await next.close();
  });

  test("Prompt Generator -> Prompt Optimizer: send output flow", async ({ page }) => {
    await page.goto("/tools/prompt-generator/index.html");
    await page.locator("#topic").fill("Onboarding email");
    await page.locator("#audience").fill("New users");
    await page.locator("#goal").fill("Write a short welcome email");
    await page.locator("#generate").click();
    await expect(page.locator("#output")).toContainText("Context:");

    const sendSelect = page.getByLabel("Send to tool");
    await sendSelect.selectOption("prompt-optimizer");
    await page.getByRole("button", { name: "Send output" }).click();

    await expect(page).toHaveURL(/\/tools\/prompt-optimizer\/index\.html/);
    await expect(page.locator("#input")).toHaveValue(/Context:/);
    await expect(page.locator("#status")).toContainText("Received text from another tool.");
  });

  test("Code Explainer: stop streaming shows stopped status", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "toolbox_ai_settings_v1",
        JSON.stringify({
          enabled: true,
          endpoint: "http://localhost:11434",
          model: "fake-local-model",
        })
      );
    });

    await page.route("http://localhost:11434/api/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: '{"response":"Overview\\n","done":false}\n{"response":"Final output","done":true}\n',
      });
    });

    await page.goto("/tools/code-explainer/index.html");
    await page.locator("#input").fill("function test(){ return 1; }");
    await page.locator("#explain").click();

    const stopBtn = page.locator("#stop-explain");
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();

    await expect(page.locator("#status")).toContainText("Explanation stopped.");
  });

  test("Prompt Optimizer: local AI network failure falls back safely", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "toolbox_ai_settings_v1",
        JSON.stringify({
          enabled: true,
          endpoint: "http://localhost:11434",
          model: "fake-local-model",
          retryAttempts: 0,
        })
      );
    });

    await page.route("http://localhost:11434/api/generate", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/tools/prompt-optimizer/index.html");
    await page.locator("#input").fill("Write a better support reply prompt");
    await page.locator("#optimize").click();

    await expect(page.locator("#status")).toContainText(/Prompt optimized\.|Local AI unavailable, used standard optimizer\./);
    await expect(page.locator("#output")).toContainText("Context:");
  });
});

