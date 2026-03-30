import { qs, setText, copyText, flashCopied } from "./toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

if (!input || !out || !status || !runBtn || !copyBtn || !clearBtn) {
  // Not a generic growth tool page.
} else {
  const MAX_INPUT_CHARS = 250000;
  const MAX_OUTPUT_CHARS = 400000;

  function show(msg, isError = false) {
    status.style.display = msg ? "" : "none";
    status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
    status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
    setText(status, msg);
  }

  function toolId() {
    const m = String(window.location.pathname).match(/\/tools\/([^/]+)\//);
    return m ? m[1] : "";
  }

  function b64ToBytes(s) {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function b64urlEncode(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlDecode(text) {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function simpleObjectToYaml(obj, indent = 0) {
    if (obj === null) return "null";
    if (Array.isArray(obj)) {
      return obj
        .map((v) => `${" ".repeat(indent)}- ${typeof v === "object" && v !== null ? "\n" + simpleObjectToYaml(v, indent + 2) : String(v)}`)
        .join("\n");
    }
    if (typeof obj === "object") {
      return Object.entries(obj)
        .map(([k, v]) => {
          if (typeof v === "object" && v !== null) return `${" ".repeat(indent)}${k}:\n${simpleObjectToYaml(v, indent + 2)}`;
          return `${" ".repeat(indent)}${k}: ${v}`;
        })
        .join("\n");
    }
    return String(obj);
  }

  function simpleYamlToObject(yaml) {
    const lines = String(yaml).split(/\r?\n/).filter((x) => x.trim());
    const out = {};
    for (const line of lines) {
      const m = line.match(/^\s*([^:]+):\s*(.*)\s*$/);
      if (!m) continue;
      const k = m[1].trim();
      const raw = m[2].trim();
      const n = Number(raw);
      out[k] = raw === "true" ? true : raw === "false" ? false : raw === "null" ? null : Number.isFinite(n) && raw !== "" ? n : raw;
    }
    return out;
  }

  function buildSchema(v) {
    if (v === null) return { type: "null" };
    if (Array.isArray(v)) return { type: "array", items: v.length ? buildSchema(v[0]) : {} };
    if (typeof v === "object") {
      const properties = {};
      const required = [];
      for (const [k, val] of Object.entries(v)) {
        properties[k] = buildSchema(val);
        required.push(k);
      }
      return { type: "object", properties, required };
    }
    return { type: typeof v };
  }

  function flattenObject(v, prefix = "", outMap = {}) {
    if (v === null || typeof v !== "object") {
      outMap[prefix] = v;
      return outMap;
    }
    if (Array.isArray(v)) {
      if (!v.length) outMap[prefix] = [];
      v.forEach((item, idx) => {
        const key = prefix ? `${prefix}.${idx}` : String(idx);
        flattenObject(item, key, outMap);
      });
      return outMap;
    }
    const keys = Object.keys(v);
    if (!keys.length && prefix) outMap[prefix] = {};
    for (const k of keys) {
      const key = prefix ? `${prefix}.${k}` : k;
      flattenObject(v[k], key, outMap);
    }
    return outMap;
  }

  function markdownToHtml(md) {
    const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return String(md)
      .split(/\r?\n/)
      .map((line) => {
        const t = line.trim();
        if (!t) return "";
        if (t.startsWith("### ")) return `<h3>${esc(t.slice(4))}</h3>`;
        if (t.startsWith("## ")) return `<h2>${esc(t.slice(3))}</h2>`;
        if (t.startsWith("# ")) return `<h1>${esc(t.slice(2))}</h1>`;
        if (t.startsWith("- ")) return `<li>${esc(t.slice(2))}</li>`;
        let x = esc(line);
        x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        x = x.replace(/\*(.+?)\*/g, "<em>$1</em>");
        x = x.replace(/`(.+?)`/g, "<code>$1</code>");
        return `<p>${x}</p>`;
      })
      .join("\n")
      .replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>\n${m.trim()}\n</ul>\n`);
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "").trim();
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const full = clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case rn:
          h = 60 * (((gn - bn) / d) % 6);
          break;
        case gn:
          h = 60 * ((bn - rn) / d + 2);
          break;
        default:
          h = 60 * ((rn - gn) / d + 4);
          break;
      }
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  const HTTP_CODES = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };

  async function runTool(raw) {
    const id = toolId();
    switch (id) {
      case "json-schema-generator": {
        const obj = JSON.parse(raw);
        return JSON.stringify(buildSchema(obj), null, 2);
      }
      case "diff-checker": {
        const [a = "", b = ""] = raw.split(/\n---\n/);
        const la = a.split(/\r?\n/);
        const lb = b.split(/\r?\n/);
        const max = Math.max(la.length, lb.length);
        const lines = [];
        for (let i = 0; i < max; i++) {
          const x = la[i] ?? "";
          const y = lb[i] ?? "";
          if (x === y) lines.push(`  ${x}`);
          else {
            lines.push(`- ${x}`);
            lines.push(`+ ${y}`);
          }
        }
        return lines.join("\n");
      }
      case "yaml-json-converter": {
        const t = raw.trim();
        if (!t) return "";
        if (t.startsWith("{") || t.startsWith("[")) return simpleObjectToYaml(JSON.parse(t));
        return JSON.stringify(simpleYamlToObject(t), null, 2);
      }
      case "csv-json-converter": {
        const t = raw.trim();
        if (!t) return "";
        if (t.startsWith("[") || t.startsWith("{")) {
          const arr = Array.isArray(JSON.parse(t)) ? JSON.parse(t) : [JSON.parse(t)];
          if (!arr.length) return "";
          const headers = Object.keys(arr[0]);
          const rows = [headers.join(",")];
          for (const row of arr) rows.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
          return rows.join("\n");
        }
        const lines = t.split(/\r?\n/).filter(Boolean);
        const headers = lines[0].split(",");
        const arr = lines.slice(1).map((line) => {
          const cells = line.split(",");
          const obj = {};
          headers.forEach((h, i) => (obj[h.trim()] = (cells[i] ?? "").trim()));
          return obj;
        });
        return JSON.stringify(arr, null, 2);
      }
      case "log-beautifier": {
        const lines = raw.split(/\r?\n/);
        return lines
          .map((line) => {
            const t = line.trim();
            if (!t) return "";
            try {
              return JSON.stringify(JSON.parse(t), null, 2);
            } catch {
              return line;
            }
          })
          .join("\n\n");
      }
      case "http-status-codes": {
        const q = raw.trim();
        if (!q) return Object.entries(HTTP_CODES).map(([k, v]) => `${k} ${v}`).join("\n");
        const n = Number(q);
        if (Number.isFinite(n) && HTTP_CODES[n]) return `${n} ${HTTP_CODES[n]}`;
        return Object.entries(HTTP_CODES)
          .filter(([k, v]) => k.includes(q) || v.toLowerCase().includes(q.toLowerCase()))
          .map(([k, v]) => `${k} ${v}`)
          .join("\n");
      }
      case "html-entity-encoder": {
        const hasEntity = /&(?:amp|lt|gt|quot|#39);/.test(raw);
        if (hasEntity) return raw.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").replaceAll("&amp;", "&");
        return raw.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
      }
      case "unicode-inspector": {
        const rows = [];
        for (const ch of raw) {
          const cp = ch.codePointAt(0);
          rows.push(`${ch}\tU+${cp.toString(16).toUpperCase().padStart(4, "0")}\t${cp}`);
        }
        return rows.join("\n");
      }
      case "hash-generator": {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        return bytesToHex(new Uint8Array(digest));
      }
      case "hmac-generator": {
        const [keyLine = "", ...rest] = raw.split(/\r?\n/);
        const key = keyLine.trim();
        const msg = rest.join("\n");
        if (!key) throw new Error("Put secret key on first line, message below.");
        const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
        return bytesToHex(new Uint8Array(sig));
      }
      case "keypair-generator": {
        const pair = await crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"]
        );
        const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
        const prv = await crypto.subtle.exportKey("jwk", pair.privateKey);
        return JSON.stringify({ publicKeyJwk: pub, privateKeyJwk: prv }, null, 2);
      }
      case "pem-fingerprint": {
        const cleaned = raw.replace(/-----BEGIN[^-]+-----/g, "").replace(/-----END[^-]+-----/g, "").replace(/\s+/g, "");
        const bytes = b64ToBytes(cleaned);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return bytesToHex(new Uint8Array(digest));
      }
      case "jwt-builder": {
        const obj = JSON.parse(raw || "{}");
        const header = obj.header || { alg: "none", typ: "JWT" };
        const payload = obj.payload || {};
        return `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}.`;
      }
      case "base64url-encoder": {
        const t = raw.trim();
        if (/^[A-Za-z0-9\-_]+$/.test(t)) {
          try {
            return b64urlDecode(t);
          } catch {
            // fallthrough to encode
          }
        }
        return b64urlEncode(raw);
      }
      case "timezone-converter": {
        const d = raw.trim() ? new Date(raw.trim()) : new Date();
        if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time input.");
        const zones = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"];
        return zones
          .map((z) => `${z.padEnd(20)} ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: z }).format(d)}`)
          .join("\n");
      }
      case "lorem-ipsum-generator": {
        const n = Math.max(1, Math.min(20, Number(raw.trim()) || 3));
        const p = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
        return Array.from({ length: n }, () => p).join("\n\n");
      }
      case "prompt-token-estimator": {
        const txt = raw.trim();
        if (!txt) return "Estimated tokens: 0";
        const chars = txt.length;
        const words = txt.split(/\s+/).filter(Boolean).length;
        const estimate = Math.ceil(chars / 4);
        return [
          `Estimated tokens: ${estimate}`,
          `Characters: ${chars}`,
          `Words: ${words}`,
          "",
          "Tip: This is an approximation (about 4 chars/token).",
        ].join("\n");
      }
      case "json-flattener": {
        const obj = JSON.parse(raw);
        const flat = flattenObject(obj);
        return JSON.stringify(flat, null, 2);
      }
      case "markdown-to-html": {
        return markdownToHtml(raw);
      }
      case "query-param-parser": {
        const t = raw.trim();
        if (!t) return "";
        if (t.startsWith("{")) {
          const obj = JSON.parse(t);
          const sp = new URLSearchParams();
          for (const [k, v] of Object.entries(obj)) sp.append(k, String(v ?? ""));
          return sp.toString();
        }
        const q = t.includes("?") ? t.slice(t.indexOf("?") + 1) : t.replace(/^\?/, "");
        const sp = new URLSearchParams(q);
        const outObj = {};
        for (const [k, v] of sp.entries()) {
          if (k in outObj) outObj[k] = Array.isArray(outObj[k]) ? [...outObj[k], v] : [outObj[k], v];
          else outObj[k] = v;
        }
        return JSON.stringify(outObj, null, 2);
      }
      case "color-converter": {
        const t = raw.trim();
        let rgb = null;
        if (t.startsWith("#")) {
          rgb = hexToRgb(t);
          if (!rgb) throw new Error("Invalid HEX color.");
        } else {
          const m = t.match(/(\d+)\D+(\d+)\D+(\d+)/);
          if (!m) throw new Error("Use HEX (#1e90ff) or RGB (30,144,255).");
          rgb = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
        }
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return [
          `HEX: ${hex}`,
          `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`,
          `HSL: ${hsl.h}, ${hsl.s}%, ${hsl.l}%`,
        ].join("\n");
      }
      default:
        return raw;
    }
  }

  async function run() {
    try {
      show("");
      const raw = input.value ?? "";
      if (!raw.trim() && toolId() !== "timezone-converter") {
        setText(out, "");
        return show("Provide input first.", true);
      }
      if (raw.length > MAX_INPUT_CHARS) {
        setText(out, "");
        return show(`Input too large (max ${MAX_INPUT_CHARS.toLocaleString()} chars).`, true);
      }
      runBtn.disabled = true;
      runBtn.dataset.prev = runBtn.textContent;
      runBtn.textContent = "Processing...";
      // Yield one frame for better responsiveness on heavier tasks.
      await new Promise((r) => setTimeout(r, 0));
      const res = await runTool(raw);
      const text = String(res ?? "");
      if (text.length > MAX_OUTPUT_CHARS) {
        setText(out, "");
        return show("Output too large to display.", true);
      }
      setText(out, text);
      show("Done.");
      window.ToolboxTracking?.trackRun(toolId(), "run");
    } catch (e) {
      setText(out, "");
      show(e instanceof Error ? e.message : "Failed to run tool.", true);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = runBtn.dataset.prev || "Run";
    }
  }

  runBtn.addEventListener("click", run);
  copyBtn.addEventListener("click", async () => {
    try {
      const text = out.textContent || "";
      if (!text) return show("Nothing to copy.", true);
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
}

