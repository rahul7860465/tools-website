import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#outputText");
const mode = qs("#mode");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");
const status = qs("#status");

const MAX_INPUT_CHARS = 200000;
const MAX_OUTPUT_CHARS = 250000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function words(s) {
  return (s || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toTitle(ws) {
  return ws.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function toSentence(s) {
  const t = (s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function toCamel(ws) {
  if (!ws.length) return "";
  const [h, ...rest] = ws;
  return h.toLowerCase() + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

function toSnake(ws) {
  return ws.map((w) => w.toLowerCase()).join("_");
}

function toKebab(ws) {
  return ws.map((w) => w.toLowerCase()).join("-");
}

function convert() {
  try {
    show("");
    const s = input.value ?? "";
    if (s.length > MAX_INPUT_CHARS) {
      output.value = "";
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} characters).`, true);
    }
    const ws = words(s);
    let out = s;
    switch (mode.value) {
      case "upper":
        out = s.toUpperCase();
        break;
      case "lower":
        out = s.toLowerCase();
        break;
      case "title":
        out = toTitle(ws);
        break;
      case "sentence":
        out = toSentence(s);
        break;
      case "camel":
        out = toCamel(ws);
        break;
      case "snake":
        out = toSnake(ws);
        break;
      case "kebab":
        out = toKebab(ws);
        break;
      default:
        break;
    }
    if ((out?.length ?? 0) > MAX_OUTPUT_CHARS) {
      output.value = "";
      return show("Converted output too large to display.", true);
    }
    output.value = out;
    show("Converted.");
    window.ToolboxTracking?.trackRun("text-case-converter", "convert");
  } catch (e) {
    output.value = "";
    show(e instanceof Error ? e.message : "Failed to convert text.", true);
  }
}

runBtn.addEventListener("click", convert);
copyBtn.addEventListener("click", async () => {
  try {
    if (!output.value) return show("Nothing to copy.", true);
    await copyText(output.value);
    show("Copied!");
    flashCopied(output);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy.", true);
  }
});
clearBtn.addEventListener("click", () => {
  try {
    input.value = "";
    output.value = "";
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

