import { qs, setText, copyText, flashCopied, safeExec, base64UrlDecodeToString, tryFormatJson } from "../../js/toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_TOKEN_CHARS = 50000;
const MAX_OUTPUT_CHARS = 400000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function decodePart(part) {
  const jsonText = base64UrlDecodeToString(part);
  return tryFormatJson(jsonText, true);
}

function decode() {
  try {
    show("");
    const token = (input.value || "").trim();
    if (!token) {
      setText(out, "");
      return show("Paste a JWT to decode.", true);
    }
    if (token.length > MAX_TOKEN_CHARS) {
      setText(out, "");
      return show(`JWT too large (max ${MAX_TOKEN_CHARS.toLocaleString()} chars).`, true);
    }

    const parts = token.split(".");
    if (parts.length < 2) {
      setText(out, "");
      return show("JWT must have at least 2 parts (header.payload).", true);
    }

    const [h, p, s] = parts;

    const res = safeExec(() => {
      const header = decodePart(h);
      const payload = decodePart(p);
      return [
        "Header:",
        header,
        "",
        "Payload:",
        payload,
        "",
        "Signature (base64url):",
        s || "(none)",
      ].join("\n");
    });

    if (!res.ok) {
      setText(out, "");
      return show(res.error, true);
    }

    if ((res.value?.length ?? 0) > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Decoded output too large to display.", true);
    }

    setText(out, res.value);
    show("Decoded.");
    window.ToolboxTracking?.trackRun("jwt-decoder", "decode");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to decode JWT.", true);
  }
}

runBtn.addEventListener("click", decode);
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

