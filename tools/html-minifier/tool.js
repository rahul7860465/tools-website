import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 100000;
const MAX_OUTPUT_CHARS = 200000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function minifyHtml(html) {
  let s = String(html ?? "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n+/g, "\n");
  s = s.replace(/>\s+</g, "><");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

function run() {
  try {
    show("");
    const raw = input.value ?? "";
    if (!raw.trim()) {
      setText(out, "");
      return show("Paste some HTML first.", true);
    }
    if (raw.length > MAX_INPUT_CHARS) {
      setText(out, "");
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
    }
    const min = minifyHtml(raw);
    if ((min?.length ?? 0) > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Minified output too large to display.", true);
    }
    setText(out, min);
    show(`Minified. Saved ${Math.max(0, raw.length - min.length)} characters.`);
    window.ToolboxTracking?.trackRun("html-minifier", "minify");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to minify HTML.", true);
  }
}

runBtn.addEventListener("click", run);
copyBtn.addEventListener("click", async () => {
  try {
    const text = out.textContent || "";
    if (!text) return show("Nothing to copy.", true);
    if (text.length > MAX_OUTPUT_CHARS) return show("Output too large to copy safely.", true);
    await copyText(text);
    show("Copied!");
    flashCopied(out);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy output.", true);
  }
});

clearBtn.addEventListener("click", () => {
  try {
    input.value = "";
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

