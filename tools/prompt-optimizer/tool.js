import { qs, setText, copyText, flashCopied, initToolWorkflowUI } from "../../js/toolkit.js";
import { attachLocalAIControls, isLocalAIEnabled, runLocalAIStream } from "../../js/ai-provider.js";

const input = qs("#input");
const output = qs("#output");
const status = qs("#status");
const optimizeBtn = qs("#optimize");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");
let activeController = null;
let userStopped = false;

function ensureStopButton() {
  if (!optimizeBtn || qs("#stop-optimize")) return;
  const stop = document.createElement("button");
  stop.type = "button";
  stop.id = "stop-optimize";
  stop.className = "btn btn-small btn-danger";
  stop.textContent = "Stop";
  stop.style.display = "none";
  optimizeBtn.parentElement?.appendChild(stop);
  stop.addEventListener("click", () => {
    userStopped = true;
    activeController?.abort();
  });
}
ensureStopButton();
const stopBtn = qs("#stop-optimize");

function showStatus(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function optimizePrompt(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const base = lines.join(" ");
  const first = lines[0] || "General request";
  return [
    "Context:",
    `You are assisting with: ${first}.`,
    "",
    "Task:",
    base,
    "",
    "Instructions:",
    "- Keep the response accurate and actionable.",
    "- Ask only essential clarifying questions.",
    "- Use concise language and avoid fluff.",
    "",
    "Output format:",
    "- Summary",
    "- Key steps",
    "- Final response",
  ].join("\n");
}

optimizeBtn?.addEventListener("click", async () => {
  const fallback = optimizePrompt(input?.value || "");
  if (!fallback) return showStatus("Paste a prompt first.", true);
  let text = fallback;
  if (isLocalAIEnabled()) {
    try {
      showStatus("Optimizing with local AI...");
      activeController?.abort();
      userStopped = false;
      activeController = new AbortController();
      if (stopBtn) stopBtn.style.display = "";
      setText(output, "");
      text = await runLocalAIStream({
        systemPrompt:
          "You improve prompts. Return only the optimized prompt with sections: Context, Task, Instructions, Output format.",
        userPrompt: `Optimize this prompt:\n\n${String(input?.value || "")}`,
        temperature: 0.35,
        maxTokens: 700,
        signal: activeController.signal,
        onToken: (_chunk, all) => setText(output, all),
      });
      if (userStopped) {
        showStatus("Optimization stopped.");
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e || "");
      if (userStopped || /aborted|aborterror/i.test(msg)) {
        showStatus("Optimization stopped.");
        return;
      }
      text = fallback;
      showStatus("Local AI unavailable, used standard optimizer.");
    } finally {
      activeController = null;
      if (stopBtn) stopBtn.style.display = "none";
    }
  }
  setText(output, text);
  showStatus("Prompt optimized.");
  window.ToolboxTracking?.trackRun("prompt-optimizer", "optimize");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const text = output?.textContent || "";
    if (!text.trim()) return showStatus("Nothing to copy.", true);
    await copyText(text);
    flashCopied(output);
    showStatus("Copied!");
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Copy failed.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  userStopped = true;
  activeController?.abort();
  if (input) input.value = "";
  setText(output, "");
  showStatus("");
});

initToolWorkflowUI({
  toolId: "prompt-optimizer",
  statusEl: status,
  getState: () => ({
    input: input?.value || "",
  }),
  setState: (s) => {
    if (input) input.value = String(s?.input || "");
  },
  getPrimaryText: () => output?.textContent || "",
  setPrimaryText: (txt) => {
    if (input) input.value = String(txt || "").slice(0, 200000);
  },
});

attachLocalAIControls({ statusEl: status });
