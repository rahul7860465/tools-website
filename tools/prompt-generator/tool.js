import { qs, setText, copyText, flashCopied, initToolWorkflowUI } from "../../js/toolkit.js";
import { attachLocalAIControls, isLocalAIEnabled, runLocalAIStream } from "../../js/ai-provider.js";

const topic = qs("#topic");
const tone = qs("#tone");
const audience = qs("#audience");
const goal = qs("#goal");
const output = qs("#output");
const status = qs("#status");
const generateBtn = qs("#generate");
const regenerateBtn = qs("#regenerate");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");
let activeController = null;

function ensureStopButton() {
  if (!generateBtn || qs("#stop-generate")) return;
  const stop = document.createElement("button");
  stop.type = "button";
  stop.id = "stop-generate";
  stop.className = "btn btn-small btn-danger";
  stop.textContent = "Stop";
  stop.style.display = "none";
  generateBtn.parentElement?.appendChild(stop);
  stop.addEventListener("click", () => activeController?.abort());
}
ensureStopButton();
const stopBtn = qs("#stop-generate");

const templates = [
  "Keep response concise and practical.",
  "Provide specific steps and examples.",
  "Use clear headings and bullet points.",
  "Avoid generic statements and filler text.",
];

function showStatus(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function buildPrompt(variant = 0) {
  const t = (topic?.value || "").trim();
  const tn = (tone?.value || "Professional").trim();
  const a = (audience?.value || "").trim();
  const g = (goal?.value || "").trim();
  if (!t || !a || !g) {
    showStatus("Please fill Topic, Audience, and Goal.", true);
    return "";
  }

  const instruction = templates[variant % templates.length];
  const result = [
    `Context:`,
    `You are an AI assistant helping with "${t}" for ${a}. Use a ${tn.toLowerCase()} tone.`,
    "",
    `Task:`,
    `${g}`,
    "",
    `Instructions:`,
    `- ${instruction}`,
    `- Ask clarifying questions only if essential details are missing.`,
    `- Optimize for clarity and actionable output.`,
    "",
    `Expected Output:`,
    `A complete response with clear structure, concise language, and usable next steps.`,
  ].join("\n");
  return result;
}

let variantIdx = 0;
generateBtn?.addEventListener("click", async () => {
  variantIdx = 0;
  const fallback = buildPrompt(variantIdx);
  if (!fallback) return;
  let text = fallback;
  if (isLocalAIEnabled()) {
    try {
      showStatus("Generating with local AI...");
      activeController?.abort();
      activeController = new AbortController();
      if (stopBtn) stopBtn.style.display = "";
      const t = (topic?.value || "").trim();
      const tn = (tone?.value || "Professional").trim();
      const a = (audience?.value || "").trim();
      const g = (goal?.value || "").trim();
      setText(output, "");
      text = await runLocalAIStream({
        systemPrompt:
          "You are a prompt engineering assistant. Return only the final prompt text with sections: Context, Task, Instructions, Expected Output.",
        userPrompt: `Topic: ${t}\nTone: ${tn}\nAudience: ${a}\nGoal: ${g}\nCreate a highly practical and concise prompt.`,
        temperature: 0.35,
        maxTokens: 700,
        signal: activeController.signal,
        onToken: (_chunk, all) => setText(output, all),
      });
    } catch {
      text = fallback;
      showStatus("Local AI unavailable, used standard generator.");
    } finally {
      activeController = null;
      if (stopBtn) stopBtn.style.display = "none";
    }
  }
  setText(output, text);
  showStatus("Prompt generated.");
  window.ToolboxTracking?.trackRun("prompt-generator", "generate");
});

regenerateBtn?.addEventListener("click", async () => {
  variantIdx += 1;
  const fallback = buildPrompt(variantIdx);
  if (!fallback) return;
  let text = fallback;
  if (isLocalAIEnabled()) {
    try {
      showStatus("Regenerating with local AI...");
      activeController?.abort();
      activeController = new AbortController();
      if (stopBtn) stopBtn.style.display = "";
      setText(output, "");
      text = await runLocalAIStream({
        systemPrompt:
          "You are a prompt engineering assistant. Return only the final prompt text with sections: Context, Task, Instructions, Expected Output.",
        userPrompt: `Regenerate this prompt with a different wording while keeping intent:\n\n${fallback}`,
        temperature: 0.6,
        maxTokens: 700,
        signal: activeController.signal,
        onToken: (_chunk, all) => setText(output, all),
      });
    } catch {
      text = fallback;
      showStatus("Local AI unavailable, used standard regenerate.");
    } finally {
      activeController = null;
      if (stopBtn) stopBtn.style.display = "none";
    }
  }
  setText(output, text);
  showStatus("Alternate prompt generated.");
  window.ToolboxTracking?.trackRun("prompt-generator", "regenerate");
});

copyBtn?.addEventListener("click", async () => {
  try {
    const text = output?.textContent || "";
    if (!text.trim()) return showStatus("Nothing to copy yet.", true);
    await copyText(text);
    flashCopied(output);
    showStatus("Copied!");
  } catch (e) {
    showStatus(e instanceof Error ? e.message : "Copy failed.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  if (topic) topic.value = "";
  if (audience) audience.value = "";
  if (goal) goal.value = "";
  if (tone) tone.value = "Professional";
  setText(output, "");
  showStatus("");
});

initToolWorkflowUI({
  toolId: "prompt-generator",
  statusEl: status,
  getState: () => ({
    topic: topic?.value || "",
    tone: tone?.value || "Professional",
    audience: audience?.value || "",
    goal: goal?.value || "",
  }),
  setState: (s) => {
    if (topic) topic.value = String(s?.topic || "");
    if (tone) tone.value = String(s?.tone || "Professional");
    if (audience) audience.value = String(s?.audience || "");
    if (goal) goal.value = String(s?.goal || "");
  },
  getPrimaryText: () => output?.textContent || "",
  setPrimaryText: (txt) => {
    // If user sends text into prompt generator, treat it as a goal draft.
    if (goal) goal.value = String(txt || "").slice(0, 5000);
  },
});

attachLocalAIControls({ statusEl: status });
