import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const optimizeBtn = qs("#optimize");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

function showStatus(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function optimizePrompt(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const base = lines.join(" ");
  const first = lines[0] || "General request";
  return [
    "Context:",
    `You are assisting with: ${first}.`,
    "",
    "Task:",
    base,
    "",
    "Instructions:",
    "- Keep the response accurate and actionable.",
    "- Ask only essential clarifying questions.",
    "- Use concise language and avoid fluff.",
    "",
    "Output format:",
    "- Summary",
    "- Key steps",
    "- Final response",
  ].join("\n");
}

optimizeBtn?.addEventListener("click", () => {
  const text = optimizePrompt(input?.value || "");
  if (!text) return showStatus("Paste a prompt first.", true);
  setText(output, text);
  showStatus("Prompt optimized.");
  window.ToolboxTracking?.trackRun("prompt-optimizer", "optimize");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const text = output?.textContent || "";
    if (!text.trim()) return showStatus("Nothing to copy.", true);
    await copyText(text);
    flashCopied(output);
    showStatus("Copied!");
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Copy failed.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  setText(output, "");
  showStatus("");
});
