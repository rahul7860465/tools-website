import { qs, setText, copyText, flashCopied, safeExec, base64EncodeUtf8, base64DecodeUtf8 } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#outputText");
const status = qs("#status");
const encodeBtn = qs("#encode");
const decodeBtn = qs("#decode");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 100000;
const MAX_OUTPUT_CHARS = 200000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

encodeBtn.addEventListener("click", () => {
  try {
    show("");
    const raw = input.value ?? "";
    if (raw.length > MAX_INPUT_CHARS) {
      output.value = "";
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
    }

    const res = safeExec(() => base64EncodeUtf8(raw));
    if (!res.ok) {
      output.value = "";
      return show(res.error, true);
    }
    if ((res.value?.length ?? 0) > MAX_OUTPUT_CHARS) {
      output.value = "";
      return show("Encoded output too large to display.", true);
    }

    output.value = res.value;
    show("Encoded to Base64.");
    window.ToolboxTracking?.trackRun("base64-encoder", "encode");
  } catch (e) {
    output.value = "";
    show(e instanceof Error ? e.message : "Unexpected error during Base64 encoding.", true);
  }
});

decodeBtn.addEventListener("click", () => {
  try {
    show("");
    const raw = (input.value ?? "").trim();
    if (raw.length > MAX_INPUT_CHARS) {
      output.value = "";
      return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
    }

    const res = safeExec(() => base64DecodeUtf8(raw));
    if (!res.ok) {
      output.value = "";
      return show("Invalid Base64.", true);
    }
    if ((res.value?.length ?? 0) > MAX_OUTPUT_CHARS) {
      output.value = "";
      return show("Decoded output too large to display.", true);
    }

    output.value = res.value;
    show("Decoded from Base64.");
    window.ToolboxTracking?.trackRun("base64-encoder", "decode");
  } catch (e) {
    output.value = "";
    show(e instanceof Error ? e.message : "Unexpected error during Base64 decoding.", true);
  }
});

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
    show(e instanceof Error ? e.message : "Failed to copy output.", true);
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

