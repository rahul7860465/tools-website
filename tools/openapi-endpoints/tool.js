import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 250000;
const MAX_OUTPUT_CHARS = 250000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function extractEndpoints(spec) {
  const paths = spec?.paths && typeof spec.paths === "object" ? spec.paths : null;
  if (!paths) throw new Error("No 'paths' found in this OpenAPI spec.");

  const methods = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
  const lines = [];
  for (const [p, ops] of Object.entries(paths)) {
    if (!ops || typeof ops !== "object") continue;
    for (const m of methods) {
      if (!ops[m]) continue;
      const op = ops[m];
      const sum = typeof op?.summary === "string" ? op.summary.trim() : "";
      const tag = Array.isArray(op?.tags) && op.tags[0] ? String(op.tags[0]) : "";
      const extra = [tag && `[${tag}]`, sum && `— ${sum}`].filter(Boolean).join(" ");
      lines.push(`${m.toUpperCase().padEnd(6)} ${p}${extra ? " " + extra : ""}`);
    }
  }
  if (!lines.length) throw new Error("No operations found under 'paths'.");
  return lines.sort().join("\n") + "\n";
}

function run() {
  try {
    show("");
    const raw = input.value ?? "";
    if (!raw.trim()) {
      setText(out, "");
      return show("Paste an OpenAPI JSON spec first.", true);
    }
    if (raw.length > MAX_INPUT_CHARS) {
      setText(out, "");
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
    }
    const spec = JSON.parse(raw);
    const text = extractEndpoints(spec);
    if (text.length > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Output too large to display.", true);
    }
    setText(out, text);
    show("Extracted.");
    window.ToolboxTracking?.trackRun("openapi-endpoints", "extract");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to extract endpoints.", true);
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

