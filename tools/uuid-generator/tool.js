import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const out = qs("#output");
const status = qs("#status");
const countEl = qs("#count");
const genBtn = qs("#generate");
const copyBtn = qs("#copy");
const downloadBtn = qs("#download");
const clearBtn = qs("#clear");

const MAX_OUTPUT_CHARS = 200000; // 5000 UUIDs * ~37 chars

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function uuidV4Fallback() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseCount() {
  const raw = String(countEl?.value ?? "").trim();
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) throw new Error("Count must be >= 1.");
  // Keep it lightweight and avoid freezing the UI.
  if (n > 5000) throw new Error("Count is too large (max 5000).");
  return Math.floor(n);
}

function generateList() {
  show("");
  let n;
  try {
    n = parseCount();
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Invalid count.", true);
    return;
  }

  const ids = new Array(n);
  for (let i = 0; i < n; i++) {
    ids[i] = crypto.randomUUID ? crypto.randomUUID() : uuidV4Fallback();
  }

  const text = ids.join("\n");
  if (text.length > MAX_OUTPUT_CHARS) {
    setText(out, "");
    show("Generated output too large to display.", true);
    return;
  }
  setText(out, text);
  show(`Generated ${n} UUID${n === 1 ? "" : "s"}.`);
  window.ToolboxTracking?.trackRun("uuid-generator", "generate");
}

genBtn.addEventListener("click", generateList);
copyBtn.addEventListener("click", async () => {
  try {
    const text = out.textContent || "";
    if (!text) return show("Nothing to copy. Generate UUIDs first.", true);
    await copyText(text);
    show("Copied!");
    flashCopied(out);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy UUID list.", true);
  }
});

downloadBtn.addEventListener("click", () => {
  try {
    const text = out.textContent || "";
    if (!text) return show("Nothing to download. Generate UUIDs first.", true);
    if (text.length > MAX_OUTPUT_CHARS) return show("Output too large to download safely.", true);

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "uuids.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    show("Downloaded UUID list.");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to download UUID list.", true);
  }
});

clearBtn.addEventListener("click", () => {
  try {
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear output.", true);
  }
});

try {
  generateList();
} catch (e) {
  // If count is invalid/missing, don't crash the page.
  setText(out, "");
}

