import { qs, setText, copyText, flashCopied, safeExec, tryFormatJson, initToolWorkflowUI } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const formatBtn = qs("#format");
const validateBtn = qs("#validate");
const copyBtn = qs("#copy");
const downloadBtn = qs("#download");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 200000;
const MAX_OUTPUT_CHARS = 250000;

function showStatus(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function format() {
  try {
    showStatus("");
    const raw = input.value ?? "";
    if (raw.length > MAX_INPUT_CHARS) {
      setText(output, "");
      showStatus(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} characters).`, true);
      return false;
    }

    const res = safeExec(() => tryFormatJson(raw, true));
    if (!res.ok) {
      setText(output, "");
      showStatus(res.error, true);
      return false;
    }

    if ((res.value?.length ?? 0) > MAX_OUTPUT_CHARS) {
      setText(output, "");
      showStatus(`Formatted output too large to display (max ${MAX_OUTPUT_CHARS.toLocaleString()} characters).`, true);
      return false;
    }

    setText(output, res.value);
    showStatus("Formatted JSON successfully.");
    window.ToolboxTracking?.trackRun("json-formatter", "format");
    return true;
  } catch (e) {
    setText(output, "");
    showStatus(e instanceof Error ? e.message : "Unexpected error while formatting JSON.", true);
    return false;
  }
}

function validate() {
  try {
    showStatus("");
    const raw = input.value ?? "";
    if (raw.length > MAX_INPUT_CHARS) {
      setText(output, "");
      showStatus(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} characters).`, true);
      return false;
    }

    const res = safeExec(() => JSON.parse(raw));
    if (!res.ok) {
      setText(output, "");
      showStatus(res.error, true);
      return false;
    }

    // Keep output consistent with the "Copy/Download formatted result" UX.
    const formatted = format();
    if (!formatted) return false;
    showStatus("Valid JSON.");
    window.ToolboxTracking?.trackRun("json-formatter", "validate");
    return true;
  } catch (e) {
    setText(output, "");
    showStatus(e instanceof Error ? e.message : "Unexpected error while validating JSON.", true);
    return false;
  }
}

copyBtn.addEventListener("click", async () => {
  try {
    const text = output.textContent || "";
    if (!text) {
      showStatus("Nothing to copy. Format/validate JSON first.", true);
      return;
    }
    await copyText(text);
    showStatus("Copied!", false);
    flashCopied(output);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") showStatus("");
    }, 1200);
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Failed to copy to clipboard.", true);
  }
});

downloadBtn.addEventListener("click", () => {
  try {
    const text = output.textContent || "";
    if (!text) {
      showStatus("Nothing to download. Format/validate JSON first.", true);
      return;
    }
    if (text.length > MAX_OUTPUT_CHARS) {
      showStatus("Output too large to download safely.", true);
      return;
    }

    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus("Downloaded formatted JSON.");
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Failed to download JSON.", true);
  }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  setText(output, "");
  showStatus("");
});

formatBtn.addEventListener("click", format);
validateBtn.addEventListener("click", validate);

initToolWorkflowUI({
  toolId: "json-formatter",
  statusEl: status,
  getState: () => ({ input: input?.value || "" }),
  setState: (s) => {
    if (input) input.value = String(s?.input || "");
  },
  getPrimaryText: () => output?.textContent || "",
  setPrimaryText: (txt) => {
    if (input) input.value = String(txt || "").slice(0, MAX_INPUT_CHARS);
  },
});

