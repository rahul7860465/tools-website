import { qs, setText, copyText } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const checkBtn = qs("#check");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

checkBtn?.addEventListener("click", () => {
  const text = String(input?.value || "").trim();
  if (!text) return show("Paste text first.", true);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const map = new Map();
  for (const s of sentences) map.set(s.toLowerCase(), (map.get(s.toLowerCase()) || 0) + 1);
  const dup = [...map.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  if (!dup.length) {
    setText(output, "No repeated sentences found.");
  } else {
    const lines = dup.map(([s, c], i) => `${i + 1}. (${c}x) ${s}`);
    setText(output, `Repeated sentences:\n\n${lines.join("\n\n")}`);
  }
  show("Duplicate check complete.");
  window.ToolboxTracking?.trackRun("plagiarism-checker", "check");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const t = output?.textContent || "";
    if (!t.trim()) return show("Nothing to copy.", true);
    await copyText(t);
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
