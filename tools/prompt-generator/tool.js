import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

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
generateBtn?.addEventListener("click", () => {
  variantIdx = 0;
  const text = buildPrompt(variantIdx);
  if (!text) return;
  setText(output, text);
  showStatus("Prompt generated.");
  window.ToolboxTracking?.trackRun("prompt-generator", "generate");
});

regenerateBtn?.addEventListener("click", () => {
  variantIdx += 1;
  const text = buildPrompt(variantIdx);
  if (!text) return;
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
