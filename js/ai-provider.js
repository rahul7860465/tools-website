import { qs, setText } from "./toolkit.js";

const SETTINGS_KEY = "toolbox_ai_settings_v1";
const DEFAULT_SETTINGS = {
  enabled: false,
  endpoint: "http://localhost:11434",
  model: "llama3.2:latest",
  timeoutMs: 45000,
  retryAttempts: 1,
};

function safeParse(raw, fallback) {
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : fallback;
  } catch {
    return fallback;
  }
}

export function getLocalAISettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const p = safeParse(raw, DEFAULT_SETTINGS);
    return {
      enabled: Boolean(p.enabled),
      endpoint: String(p.endpoint || DEFAULT_SETTINGS.endpoint),
      model: String(p.model || DEFAULT_SETTINGS.model),
      timeoutMs: Number(p.timeoutMs) > 0 ? Number(p.timeoutMs) : DEFAULT_SETTINGS.timeoutMs,
      retryAttempts: Number(p.retryAttempts) >= 0 ? Number(p.retryAttempts) : DEFAULT_SETTINGS.retryAttempts,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setLocalAISettings(next) {
  const current = getLocalAISettings();
  const merged = {
    enabled: typeof next?.enabled === "boolean" ? next.enabled : current.enabled,
    endpoint: String(next?.endpoint || current.endpoint || DEFAULT_SETTINGS.endpoint),
    model: String(next?.model || current.model || DEFAULT_SETTINGS.model),
    timeoutMs: Number(next?.timeoutMs) > 0 ? Number(next.timeoutMs) : current.timeoutMs,
    retryAttempts: Number(next?.retryAttempts) >= 0 ? Number(next.retryAttempts) : current.retryAttempts,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
  return merged;
}

export function isLocalAIEnabled() {
  return getLocalAISettings().enabled;
}

async function postJson(url, body, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    signal,
  });
  if (!res.ok) throw new Error(`Local AI request failed (${res.status}).`);
  return await res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutSignal(timeoutMs, parentSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Local AI request timed out.")), timeoutMs);
  const onAbort = () => controller.abort(parentSignal.reason || new Error("Aborted"));
  if (parentSignal) parentSignal.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener("abort", onAbort);
    },
  };
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Local AI connection failed (${res.status}).`);
  return await res.json();
}

export async function listLocalModels(signal) {
  const s = getLocalAISettings();
  const base = String(s.endpoint || DEFAULT_SETTINGS.endpoint).replace(/\/+$/, "");
  const data = await getJson(`${base}/api/tags`, signal);
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.map((m) => String(m?.name || "")).filter(Boolean);
}

export async function runLocalAI({ systemPrompt = "", userPrompt = "", temperature = 0.3, maxTokens = 700, signal } = {}) {
  const s = getLocalAISettings();
  if (!s.enabled) throw new Error("Local AI mode is disabled.");
  const base = String(s.endpoint || DEFAULT_SETTINGS.endpoint).replace(/\/+$/, "");
  const prompt = `${String(systemPrompt || "").trim()}\n\n${String(userPrompt || "").trim()}`.trim();
  if (!prompt) throw new Error("Prompt is empty.");
  let data = null;
  let lastErr = null;
  const attempts = Math.max(0, Number(s.retryAttempts) || 0) + 1;
  for (let i = 0; i < attempts; i += 1) {
    const ts = timeoutSignal(s.timeoutMs, signal);
    try {
      data = await postJson(
        `${base}/api/generate`,
        {
          model: s.model,
          prompt,
          stream: false,
          options: {
            temperature: Number(temperature) || 0.3,
            num_predict: Number(maxTokens) || 700,
          },
        },
        ts.signal
      );
      ts.cleanup();
      lastErr = null;
      break;
    } catch (e) {
      ts.cleanup();
      lastErr = e;
      if (i < attempts - 1) await delay(250);
    }
  }
  if (lastErr) throw lastErr;
  const text = String(data?.response || "").trim();
  if (!text) throw new Error("Local AI returned empty output.");
  return text;
}

export async function runLocalAIStream({
  systemPrompt = "",
  userPrompt = "",
  temperature = 0.3,
  maxTokens = 700,
  signal,
  onToken,
} = {}) {
  const s = getLocalAISettings();
  if (!s.enabled) throw new Error("Local AI mode is disabled.");
  const base = String(s.endpoint || DEFAULT_SETTINGS.endpoint).replace(/\/+$/, "");
  const prompt = `${String(systemPrompt || "").trim()}\n\n${String(userPrompt || "").trim()}`.trim();
  if (!prompt) throw new Error("Prompt is empty.");

  const attempts = Math.max(0, Number(s.retryAttempts) || 0) + 1;
  let lastErr = null;
  for (let i = 0; i < attempts; i += 1) {
    const ts = timeoutSignal(s.timeoutMs, signal);
    try {
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: s.model,
          prompt,
          stream: true,
          options: {
            temperature: Number(temperature) || 0.3,
            num_predict: Number(maxTokens) || 700,
          },
        }),
        signal: ts.signal,
      });
      if (!res.ok) throw new Error(`Local AI request failed (${res.status}).`);
      if (!res.body) throw new Error("Streaming not supported by this browser.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl = buf.indexOf("\n");
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) {
            try {
              const row = JSON.parse(line);
              const chunk = String(row?.response || "");
              if (chunk) {
                finalText += chunk;
                if (typeof onToken === "function") onToken(chunk, finalText);
              }
              if (row?.done) {
                ts.cleanup();
                return finalText.trim();
              }
            } catch {
              // ignore malformed line chunks
            }
          }
          nl = buf.indexOf("\n");
        }
      }
      ts.cleanup();
      return finalText.trim();
    } catch (e) {
      ts.cleanup();
      lastErr = e;
      if (i < attempts - 1) await delay(250);
    }
  }
  throw lastErr || new Error("Local AI streaming failed.");
}

export function attachLocalAIControls({ statusEl } = {}) {
  const actions = qs(".actions");
  if (!actions || document.getElementById("local-ai-controls")) return;

  const settings = getLocalAISettings();
  const wrap = document.createElement("details");
  wrap.id = "local-ai-controls";
  wrap.className = "panel";
  wrap.style.marginTop = "10px";

  const summary = document.createElement("summary");
  summary.style.cursor = "pointer";
  summary.style.padding = "8px 10px";
  summary.innerHTML = "<strong>Local AI (Ollama)</strong> <span class=\"muted\">Private mode</span>";
  wrap.appendChild(summary);

  const body = document.createElement("div");
  body.className = "panel-body";
  body.style.display = "grid";
  body.style.gap = "8px";

  const enabledRow = document.createElement("label");
  enabledRow.className = "muted";
  enabledRow.style.display = "flex";
  enabledRow.style.alignItems = "center";
  enabledRow.style.gap = "8px";
  enabledRow.innerHTML = `<input id="local-ai-enabled" type="checkbox" ${settings.enabled ? "checked" : ""}/> Enable local AI`;

  const endpoint = document.createElement("input");
  endpoint.id = "local-ai-endpoint";
  endpoint.className = "input";
  endpoint.value = settings.endpoint;
  endpoint.placeholder = "http://localhost:11434";

  const model = document.createElement("select");
  model.id = "local-ai-model";
  model.className = "input";
  model.innerHTML = `<option value="${settings.model}">${settings.model}</option>`;

  const buttons = document.createElement("div");
  buttons.className = "actions";
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "btn btn-small";
  refresh.textContent = "Refresh models";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn btn-small btn-primary";
  save.textContent = "Save AI settings";
  buttons.appendChild(refresh);
  buttons.appendChild(save);

  body.appendChild(enabledRow);
  body.appendChild(endpoint);
  body.appendChild(model);
  body.appendChild(buttons);
  wrap.appendChild(body);
  actions.parentElement?.appendChild(wrap);

  refresh.addEventListener("click", async () => {
    try {
      setLocalAISettings({
        enabled: Boolean(qs("#local-ai-enabled")?.checked),
        endpoint: endpoint.value.trim(),
        model: model.value || settings.model,
      });
      const list = await listLocalModels();
      model.innerHTML = "";
      if (!list.length) {
        model.innerHTML = `<option value="${settings.model}">${settings.model}</option>`;
      } else {
        for (const name of list) {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          if (name === settings.model) opt.selected = true;
          model.appendChild(opt);
        }
      }
      if (statusEl) setText(statusEl, "Local AI models loaded.");
    } catch (e) {
      if (statusEl) setText(statusEl, e instanceof Error ? e.message : "Failed to load models.");
    }
  });

  save.addEventListener("click", () => {
    const saved = setLocalAISettings({
      enabled: Boolean(qs("#local-ai-enabled")?.checked),
      endpoint: endpoint.value.trim(),
      model: model.value || settings.model,
    });
    if (statusEl) setText(statusEl, saved.enabled ? "Local AI enabled." : "Local AI disabled.");
  });
}

