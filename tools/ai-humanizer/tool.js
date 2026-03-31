import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const runBtn = qs("#humanize");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function humanize(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  t = t
    .replace(/\bmoreover\b/gi, "also")
    .replace(/\bfurthermore\b/gi, "besides")
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bit is important to note that\b/gi, "note that")
    .replace(/\butilize\b/gi, "use")
    .replace(/\bleverage\b/gi, "use")
    .replace(/\bthus\b/gi, "so")
    .replace(/\bhence\b/gi, "so");
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences
    .map((s, i) => (i % 2 === 0 ? s : s.replace(/^([A-Z])/, (m) => m.toLowerCase())))
    .join(" ");
}

runBtn?.addEventListener("click", () => {
  const src = input?.value || "";
  if (!src.trim()) return show("Paste text first.", true);
  setText(output, humanize(src));
  show("Humanized text ready.");
  window.ToolboxTracking?.trackRun("ai-humanizer", "humanize");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const t = output?.textContent || "";
    if (!t.trim()) return show("Nothing to copy.", true);
    await copyText(t);
    flashCopied(output);
    show("Copied!");
  } catch (e) {
    show(e instanceof Error ? e.message : "Copy failed.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  setText(output, "");
  show("");
});
