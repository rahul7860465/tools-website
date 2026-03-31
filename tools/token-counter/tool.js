import { qs, setText, copyText } from "../../js/toolkit.js";

const input = qs("#input");
const chars = qs("#chars");
const words = qs("#words");
const tokens = qs("#tokens");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");
const status = qs("#status");

function showStatus(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function updateCounts() {
  const text = String(input?.value || "");
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tokenCount = Math.ceil(charCount / 4);
  setText(chars, String(charCount));
  setText(words, String(wordCount));
  setText(tokens, String(tokenCount));
}

input?.addEventListener("input", () => {
  updateCounts();
  window.ToolboxTracking?.trackRun("token-counter", "type");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const text = input?.value || "";
    if (!text.trim()) return showStatus("Nothing to copy.", true);
    await copyText(text);
    showStatus("Copied!");
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Copy failed.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  updateCounts();
  showStatus("");
});

updateCounts();
