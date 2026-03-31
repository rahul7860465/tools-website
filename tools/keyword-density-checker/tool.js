import { qs, setText } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const runBtn = qs("#analyze");
const clearBtn = qs("#clear");

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

runBtn?.addEventListener("click", () => {
  const text = String(input?.value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return show("Paste article text first.", true);
  const map = new Map();
  for (const w of words) map.set(w, (map.get(w) || 0) + 1);
  const rows = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, f]) => ({ k, f, d: ((f / words.length) * 100).toFixed(2) }));
  const table = ["Keyword\tFrequency\tDensity %", ...rows.map((r) => `${r.k}\t${r.f}\t${r.d}`)].join("\n");
  setText(output, table);
  show("Density analysis ready.");
  window.ToolboxTracking?.trackRun("keyword-density-checker", "analyze");
});

clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  setText(output, "");
  show("");
});
