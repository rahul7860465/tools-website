import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const runBtn = qs("#paraphrase");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const replacements = [
  ["important", "key"],
  ["help", "assist"],
  ["show", "display"],
  ["use", "apply"],
  ["make sure", "ensure"],
  ["a lot of", "many"],
];

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function paraphrase(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  for (const [a, b] of replacements) {
    t = t.replace(new RegExp(`\\b${a}\\b`, "gi"), b);
  }
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1) {
    const first = sentences.shift();
    sentences.push(first || "");
  }
  return sentences.join(" ");
}

runBtn?.addEventListener("click", () => {
  const src = input?.value || "";
  if (!src.trim()) return show("Paste text first.", true);
  setText(output, paraphrase(src));
  show("Paraphrased text ready.");
  window.ToolboxTracking?.trackRun("paraphraser", "paraphrase");
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
