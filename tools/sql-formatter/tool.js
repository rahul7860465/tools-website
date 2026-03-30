import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 120000;
const MAX_OUTPUT_CHARS = 200000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function formatSql(sql) {
  let s = String(sql ?? "").trim();
  if (!s) return "";
  // Very lightweight formatter (no parser): normalize spaces + newline around common keywords.
  s = s.replace(/\s+/g, " ");
  const KW = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "HAVING",
    "ORDER BY",
    "LIMIT",
    "OFFSET",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "JOIN",
    "ON",
    "UNION",
    "UNION ALL",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
  ];
  for (const k of KW.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${k.replaceAll(" ", "\\\\s+")}\\b`, "gi");
    s = s.replace(re, `\n${k}`);
  }
  s = s
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("ON ") || line.startsWith("AND ") || line.startsWith("OR ")) return "  " + line;
      return line;
    })
    .join("\n");

  // Small spacing tweaks
  s = s.replace(/\s*=\s*/g, " = ");
  s = s.replace(/\s*,\s*/g, ", ");
  return s.trim();
}

function run() {
  try {
    show("");
    const raw = input.value ?? "";
    if (!raw.trim()) {
      setText(out, "");
      return show("Paste some SQL first.", true);
    }
    if (raw.length > MAX_INPUT_CHARS) {
      setText(out, "");
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
    }
    const formatted = formatSql(raw);
    if ((formatted?.length ?? 0) > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Formatted output too large to display.", true);
    }
    setText(out, formatted);
    show("Formatted.");
    window.ToolboxTracking?.trackRun("sql-formatter", "format");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to format SQL.", true);
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

