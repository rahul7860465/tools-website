import { qs, setText, copyText } from "../../js/toolkit.js";

const input = qs("#input");
const aiProb = qs("#ai-prob");
const humanProb = qs("#human-prob");
const output = qs("#output");
const status = qs("#status");
const detectBtn = qs("#detect");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function scoreText(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  const unique = new Set(words).size;
  const ratio = unique / Math.max(words.length, 1);
  const avgLen = words.reduce((n, w) => n + w.length, 0) / Math.max(words.length, 1);
  const repetitive = ratio < 0.45 ? 25 : 0;
  const flat = avgLen < 4.5 || avgLen > 7.8 ? 10 : 0;
  const connectors = (t.match(/\bmoreover|furthermore|additionally|therefore|overall\b/gi) || []).length;
  const connectorScore = Math.min(20, connectors * 4);
  const ai = Math.max(5, Math.min(95, 45 + repetitive + flat + connectorScore));
  return ai;
}

detectBtn?.addEventListener("click", () => {
  const txt = input?.value || "";
  if (!txt.trim()) return show("Paste text first.", true);
  const ai = scoreText(txt);
  const human = 100 - ai;
  setText(aiProb, `${ai}%`);
  setText(humanProb, `${human}%`);
  setText(output, `AI probability: ${ai}%\nHuman probability: ${human}%\n\nNote: This is a heuristic estimate, not a definitive verdict.`);
  show("Analysis complete.");
  window.ToolboxTracking?.trackRun("ai-detector", "detect");
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
  setText(aiProb, "0%");
  setText(humanProb, "0%");
  setText(output, "");
  show("");
});
