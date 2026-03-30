import { qs, setText, copyText, flashCopied, safeExec } from "../../js/toolkit.js";

const inputEl = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 64;
const MAX_OUTPUT_CHARS = 2000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function parseTimestamp(raw) {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error("Enter a Unix timestamp first.");
  if (!/^-?\d+$/.test(s)) throw new Error("Timestamp must be an integer.");
  const n = Number(s);
  // Heuristic: < 1e12 => seconds, otherwise milliseconds.
  const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
  return ms;
}

function convert() {
  try {
    show("");
    const raw = inputEl.value ?? "";
    if (String(raw).length > MAX_INPUT_CHARS) {
      setText(out, "");
      return show(`Timestamp input too long (max ${MAX_INPUT_CHARS} chars).`, true);
    }

    const res = safeExec(() => {
      const ms = parseTimestamp(raw);
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid timestamp.");
      return [
        `ISO (UTC): ${d.toISOString()}`,
        `Local:    ${d.toString()}`,
        `Unix (s): ${Math.floor(ms / 1000)}`,
        `Unix (ms): ${ms}`,
      ].join("\n");
    });
    if (!res.ok) {
      setText(out, "");
      return show(res.error, true);
    }

    if ((res.value?.length ?? 0) > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Converted output too large to display.", true);
    }

    setText(out, res.value);
    show("Converted.");
    window.ToolboxTracking?.trackRun("timestamp-converter", "convert");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to convert timestamp.", true);
  }
}

runBtn.addEventListener("click", convert);
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
    show(e instanceof Error ? e.message : "Failed to copy result.", true);
  }
});

clearBtn.addEventListener("click", () => {
  try {
    inputEl.value = "";
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

