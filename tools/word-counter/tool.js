import { qs, setText, copyText } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");
const status = qs("#status");

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function recalc() {
  const text = String(input?.value || "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
  const readingMin = words / 200;
  setText(
    output,
    [
      `Words: ${words}`,
      `Characters: ${chars}`,
      `Characters (no spaces): ${charsNoSpace}`,
      `Sentences: ${sentences}`,
      `Estimated reading time: ${readingMin < 1 ? "< 1 min" : `${readingMin.toFixed(1)} min`}`,
    ].join("\n")
  );
}

input?.addEventListener("input", recalc);
copyBtn?.addEventListener("click", async () => {
  try {
    const text = String(input?.value || "");
    if (!text.trim()) return show("Nothing to copy.", true);
    await copyText(text);
    show("Copied!");
  } catch (e) {
    show(e instanceof Error ? e.message : "Copy failed.", true);
  }
});
clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  show("");
  recalc();
});

recalc();
