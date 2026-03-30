import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const lengthEl = qs("#length");
const lowerEl = qs("#lower");
const upperEl = qs("#upper");
const numsEl = qs("#nums");
const symsEl = qs("#syms");
const out = qs("#output");
const status = qs("#status");
const genBtn = qs("#generate");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const sets = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  nums: "0123456789",
  syms: "!@#$%^&*()-_=+[]{};:,.?/|~",
};

const MAX_OUTPUT_CHARS = 128;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function randInt(max) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}

function pick(str) {
  return str[randInt(str.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generate() {
  try {
    show("");
    const len = Math.max(4, Math.min(128, Number(lengthEl.value || 16)));
    const enabled = [];
    if (lowerEl.checked) enabled.push(sets.lower);
    if (upperEl.checked) enabled.push(sets.upper);
    if (numsEl.checked) enabled.push(sets.nums);
    if (symsEl.checked) enabled.push(sets.syms);

    if (!enabled.length) {
      show("Select at least one character set.", true);
      setText(out, "");
      return;
    }

    const all = enabled.join("");
    const chars = [];

    // Ensure at least one char from each enabled set.
    for (const s of enabled) chars.push(pick(s));
    while (chars.length < len) chars.push(pick(all));

    shuffle(chars);
    const result = chars.join("");
    if (result.length > MAX_OUTPUT_CHARS) throw new Error("Generated password unexpectedly large.");
    setText(out, result);
    show("Generated.");
    window.ToolboxTracking?.trackRun("password-generator", "generate");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to generate password.", true);
  }
}

genBtn.addEventListener("click", generate);
copyBtn.addEventListener("click", async () => {
  try {
    const text = out.textContent || "";
    if (!text) return show("Nothing to copy.", true);
    await copyText(text);
    show("Copied!");
    flashCopied(out);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy password.", true);
  }
});
clearBtn.addEventListener("click", () => {
  try {
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

generate();

