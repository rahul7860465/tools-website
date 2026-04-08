export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function setText(el, text) {
  if (!el) return;
  el.textContent = text == null ? "" : String(text);
}

export function copyText(text) {
  const value = String(text ?? "");

  // Preferred modern API (requires secure context; works on localhost/https).
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  // Fallback for older browsers / non-secure contexts:
  // Use a temporary textarea + execCommand('copy').
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.left = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand && document.execCommand("copy");
      ta.remove();
      if (!ok) return reject(new Error("Clipboard copy not supported in this browser context."));
      resolve();
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Failed to copy."));
    }
  });
}

export function flashCopied(el, ms = 900) {
  if (!el) return;
  el.classList.add("copied-flash");
  window.setTimeout(() => el.classList.remove("copied-flash"), ms);
}

export function tryFormatJson(text, pretty = true) {
  const v = JSON.parse(text);
  return pretty ? JSON.stringify(v, null, 2) : JSON.stringify(v);
}

export function base64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64DecodeUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function base64UrlDecodeToString(b64url) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  return base64DecodeUtf8(padded);
}

export function safeExec(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---- Shareable tool state + cross-tool workflows ----
function getSiteRootUrl() {
  const pathname = String(window.location.pathname || "/");
  if (/\/tools\/[^/]+\//.test(pathname)) return new URL("../../", window.location.href);
  if (/\/seo\//.test(pathname)) return new URL("../", window.location.href);
  return new URL("./", window.location.href);
}

const SITE_ROOT_URL = getSiteRootUrl();

export function base64UrlEncodeUtf8(str) {
  const b64 = base64EncodeUtf8(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlEncodeJson(obj) {
  return base64UrlEncodeUtf8(JSON.stringify(obj ?? {}));
}

export function base64UrlDecodeJson(b64url) {
  const raw = base64UrlDecodeToString(String(b64url || ""));
  return JSON.parse(raw);
}

export function readHashParams() {
  const raw = String(window.location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(raw);
  return params;
}

export function writeHashParams(params) {
  const s = params instanceof URLSearchParams ? params.toString() : String(params || "");
  const next = s ? `#${s}` : "";
  // Avoid creating noisy history entries.
  try {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  } catch {
    window.location.hash = next;
  }
}

export function getHashJson(key) {
  try {
    const params = readHashParams();
    const v = params.get(key);
    if (!v) return null;
    return base64UrlDecodeJson(v);
  } catch {
    return null;
  }
}

export function setHashJson(key, value) {
  const params = readHashParams();
  if (value == null) params.delete(key);
  else params.set(key, base64UrlEncodeJson(value));
  writeHashParams(params);
}

export async function fetchToolRegistry() {
  const url = new URL("tools.json", SITE_ROOT_URL).toString();
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to load tool registry.");
  const json = await res.json();
  return Array.isArray(json?.tools) ? json.tools : [];
}

function toolAbsUrl(toolId) {
  // Always absolute from current page via root URL.
  const rel = `tools/${toolId}/index.html`;
  return new URL(rel, SITE_ROOT_URL).toString();
}

function ensureBtn(text, className, ariaLabel) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className || "btn btn-small";
  b.textContent = text;
  if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
  return b;
}

function findActionsContainer() {
  const byId = document.querySelector("#actions");
  if (byId) return byId;
  const actions = document.querySelector(".actions");
  return actions || null;
}

export async function initToolWorkflowUI(opts) {
  const {
    toolId,
    getState,
    setState,
    getPrimaryText,
    setPrimaryText,
    statusEl,
  } = opts || {};

  if (!toolId) return;

  // Restore state from URL hash.
  const state = getHashJson("tb_state");
  if (state && state.tool === toolId && state.data && typeof setState === "function") {
    try {
      setState(state.data);
      if (statusEl) setText(statusEl, "Restored from share link.");
    } catch {
      // ignore restore failures
    }
  }

  // Receive cross-tool payload (tb_send).
  const send = getHashJson("tb_send");
  if (send && send.to === toolId && typeof setPrimaryText === "function") {
    try {
      const txt = String(send.text ?? "");
      if (txt) setPrimaryText(txt);
      const params = readHashParams();
      params.delete("tb_send");
      writeHashParams(params);
      if (statusEl) setText(statusEl, "Received text from another tool.");
    } catch {
      // ignore
    }
  }

  // Add UI controls.
  const actions = findActionsContainer();
  if (!actions) return;

  // Share link button.
  const shareBtn = ensureBtn("Share link", "btn btn-small", "Create a shareable link");
  shareBtn.addEventListener("click", async () => {
    try {
      const data = typeof getState === "function" ? getState() : {};
      const payload = { tool: toolId, data };
      setHashJson("tb_state", payload);
      const url = window.location.href;
      await copyText(url);
      if (statusEl) setText(statusEl, "Share link copied.");
      flashCopied(actions);
      window.ToolboxTracking?.trackRun(toolId, "share_link");
    } catch (e) {
      if (statusEl) setText(statusEl, e instanceof Error ? e.message : "Failed to create share link.");
    }
  });

  // Send-to panel.
  const wrap = document.createElement("div");
  wrap.className = "actions";
  wrap.style.marginTop = "10px";
  wrap.style.display = "flex";
  wrap.style.flexWrap = "wrap";
  wrap.style.gap = "8px";
  wrap.setAttribute("aria-label", "Workflow actions");

  const select = document.createElement("select");
  select.className = "input";
  select.style.maxWidth = "280px";
  select.setAttribute("aria-label", "Send to tool");
  select.innerHTML = `<option value="">Send to…</option>`;

  let registry = [];
  try {
    registry = await fetchToolRegistry();
  } catch {
    registry = [];
  }
  for (const t of registry) {
    if (!t?.id || t.id === toolId) continue;
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = String(t.name || t.id);
    select.appendChild(opt);
  }

  const sendBtn = ensureBtn("Send output", "btn btn-small", "Send output to another tool");
  sendBtn.addEventListener("click", () => {
    const to = String(select.value || "").trim();
    if (!to) {
      if (statusEl) setText(statusEl, "Select a tool first.");
      return;
    }
    const text = typeof getPrimaryText === "function" ? String(getPrimaryText() || "") : "";
    if (!text.trim()) {
      if (statusEl) setText(statusEl, "Nothing to send yet.");
      return;
    }
    const url = toolAbsUrl(to);
    const hash = new URLSearchParams();
    hash.set("tb_send", base64UrlEncodeJson({ to, text, from: toolId }));
    window.location.href = `${url}#${hash.toString()}`;
  });

  const clearLinkBtn = ensureBtn("Clear link state", "btn btn-small btn-danger", "Clear share link state");
  clearLinkBtn.addEventListener("click", () => {
    const params = readHashParams();
    params.delete("tb_state");
    params.delete("tb_send");
    writeHashParams(params);
    if (statusEl) setText(statusEl, "");
  });

  wrap.appendChild(select);
  wrap.appendChild(sendBtn);
  wrap.appendChild(shareBtn);
  wrap.appendChild(clearLinkBtn);

  actions.parentElement?.appendChild(wrap);
}

