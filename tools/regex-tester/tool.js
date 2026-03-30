import { qs, setText, copyText, flashCopied, safeExec } from "../../js/toolkit.js";

const pattern = qs("#pattern");
const flags = qs("#flags");
const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_PATTERN_CHARS = 500;
const MAX_FLAGS_CHARS = 10;
const MAX_TEXT_CHARS = 200000;
const MAX_OUTPUT_CHARS = 500000;
const MAX_MATCHES = 2000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function formatMatch(m, idx) {
  const groups = m.slice(1);
  const g = groups.length ? `\n  groups: ${JSON.stringify(groups)}` : "";
  return `#${idx + 1} @ ${m.index}\n  match: ${JSON.stringify(m[0])}${g}`;
}

function run() {
  try {
    show("");
    const p = pattern.value ?? "";
    const f = flags.value ?? "";
    const text = input.value ?? "";

    if (!p.trim()) {
      setText(out, "");
      return show("Pattern cannot be empty.", true);
    }
    if (p.length > MAX_PATTERN_CHARS) {
      setText(out, "");
      return show(`Pattern too long (max ${MAX_PATTERN_CHARS.toLocaleString()} chars).`, true);
    }
    if (f.length > MAX_FLAGS_CHARS) {
      setText(out, "");
      return show(`Flags too long (max ${MAX_FLAGS_CHARS.toLocaleString()} chars).`, true);
    }
    if (text.length > MAX_TEXT_CHARS) {
      setText(out, "");
      return show(`Input text too large (max ${MAX_TEXT_CHARS.toLocaleString()} chars).`, true);
    }

    const rxRes = safeExec(() => new RegExp(p, f));
    if (!rxRes.ok) {
      setText(out, "");
      return show(rxRes.error, true);
    }

    const rx = rxRes.value;
    const matches = [];
    let outputChars = 0;
    let truncated = false;

    if (rx.global) {
      let m;
      while ((m = rx.exec(text))) {
        const formatted = formatMatch(m, matches.length);
        outputChars += formatted.length;
        if (matches.length >= MAX_MATCHES || outputChars > MAX_OUTPUT_CHARS) {
          truncated = true;
          break;
        }
        matches.push(formatted);
        if (m[0] === "") rx.lastIndex++;
      }
    } else {
      const m = rx.exec(text);
      if (m) {
        const formatted = formatMatch(m, 0);
        outputChars += formatted.length;
        if (outputChars > MAX_OUTPUT_CHARS) truncated = true;
        else matches.push(formatted);
      }
    }

    if (!matches.length) {
      setText(out, "No matches.");
      return show(truncated ? "Output truncated." : "No matches found.");
    }

    const joined = matches.join("\n\n");
    if (joined.length > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Result too large to display.", true);
    }
    setText(out, joined);
    show(truncated ? `Found ${matches.length}+ matches (truncated).` : `Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`);
    window.ToolboxTracking?.trackRun("regex-tester", "run");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to run regex.", true);
  }
}

runBtn.addEventListener("click", run);
copyBtn.addEventListener("click", async () => {
  try {
    const text = out.textContent || "";
    if (!text || text === "No matches.") return show("Nothing to copy.", true);
    if (text.length > MAX_OUTPUT_CHARS) return show("Result too large to copy safely.", true);
    await copyText(text);
    show("Copied!");
    flashCopied(out);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy matches.", true);
  }
});

clearBtn.addEventListener("click", () => {
  try {
    pattern.value = "";
    flags.value = "g";
    input.value = "";
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

