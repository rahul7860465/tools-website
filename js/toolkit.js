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

