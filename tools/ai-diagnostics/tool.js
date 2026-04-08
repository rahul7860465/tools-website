import { qs, setText } from "../../js/toolkit.js";
import { getLocalAISettings, setLocalAISettings, listLocalModels, runLocalAI, runLocalAIStream } from "../../js/ai-provider.js";

const endpointEl = qs("#endpoint");
const modelEl = qs("#model");
const runAllBtn = qs("#run-all");
const loadModelsBtn = qs("#load-models");
const clearBtn = qs("#clear");
const output = qs("#output");
const status = qs("#status");

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function append(line) {
  const cur = String(output?.textContent || "");
  setText(output, cur ? `${cur}\n${line}` : line);
}

async function loadModels() {
  const s = getLocalAISettings();
  const endpoint = String(endpointEl?.value || s.endpoint || "http://localhost:11434").trim();
  setLocalAISettings({ ...s, endpoint, enabled: true });
  const models = await listLocalModels();
  if (modelEl) {
    modelEl.innerHTML = "";
    if (!models.length) {
      modelEl.innerHTML = `<option value="">No models found</option>`;
    } else {
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        if (m === s.model) opt.selected = true;
        modelEl.appendChild(opt);
      }
    }
  }
  return models;
}

async function runDiagnostics() {
  setText(output, "");
  show("Running diagnostics...");
  const current = getLocalAISettings();
  const endpoint = String(endpointEl?.value || current.endpoint || "http://localhost:11434").trim();
  const selectedModel = String(modelEl?.value || "").trim();
  const settings = setLocalAISettings({
    ...current,
    enabled: true,
    endpoint,
    model: selectedModel || current.model,
    timeoutMs: 120000,
    retryAttempts: 0,
  });
  if (endpointEl) endpointEl.value = settings.endpoint;

  append("AI Diagnostics");
  append(`Endpoint: ${settings.endpoint}`);
  append(`Model: ${settings.model}`);
  append("");

  try {
    const models = await listLocalModels();
    append(`Connection: PASS`);
    append(`Models found: ${models.length}`);
    if (models.length) append(`Model list: ${models.join(", ")}`);
  } catch (e) {
    append(`Connection: FAIL`);
    append(`Reason: ${e instanceof Error ? e.message : "Unknown error"}`);
    append("Hint: Use endpoint http://localhost:11434 and ensure Ollama allows browser origin.");
    show("Diagnostics failed at connection step.", true);
    return;
  }

  try {
    const text = await runLocalAI({
      systemPrompt: "Return a very short health response.",
      userPrompt: "Respond with only: OK",
      maxTokens: 8,
      temperature: 0,
    });
    append("");
    append(`Generate test: PASS`);
    append(`Response: ${text.slice(0, 120)}`);
  } catch (e) {
    append("");
    append(`Generate test: FAIL`);
    append(`Reason: ${e instanceof Error ? e.message : "Unknown error"}`);
    append("Hint: If using custom model, verify model exists in /api/tags.");
  }

  try {
    let streamText = "";
    await runLocalAIStream({
      systemPrompt: "Return a short streaming response.",
      userPrompt: "Say hello in 3 words.",
      maxTokens: 8,
      temperature: 0,
      onToken: (_chunk, full) => {
        streamText = full;
      },
    });
    append("");
    append(`Streaming test: PASS`);
    append(`Stream output: ${streamText.slice(0, 120) || "(empty)"}`);
    show("Diagnostics completed.");
  } catch (e) {
    append("");
    append(`Streaming test: FAIL`);
    append(`Reason: ${e instanceof Error ? e.message : "Unknown error"}`);
    append("Hint: First run may be slow; try again after model warmup.");
    show("Diagnostics completed with some failures.", true);
  }
}

loadModelsBtn?.addEventListener("click", async () => {
  try {
    const models = await loadModels();
    show(models.length ? "Models loaded." : "No models found on endpoint.");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to load models.", true);
  }
});

runAllBtn?.addEventListener("click", runDiagnostics);
clearBtn?.addEventListener("click", () => {
  setText(output, "");
  show("");
});

(() => {
  const s = getLocalAISettings();
  if (endpointEl) endpointEl.value = s.endpoint;
  loadModels().catch(() => {});
})();
