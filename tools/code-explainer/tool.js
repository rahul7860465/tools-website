import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const language = qs("#language");
const output = qs("#output");
const status = qs("#status");
const explainBtn = qs("#explain");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

function showStatus(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function detectLanguage(code) {
  const c = String(code || "");
  if (/<\/?[a-z][\s\S]*>/i.test(c)) return "html";
  if (/^\s*def\s+\w+\s*\(/m.test(c) || /^\s*import\s+\w+/m.test(c)) return "python";
  if (/^\s*function\s+\w+\s*\(/m.test(c) || /\bconst\b|\blet\b|\b=>/m.test(c)) return "javascript";
  if (/#include\s*<|std::|int\s+main\s*\(/m.test(c)) return "cpp";
  if (/\bpublic\s+class\b|\bSystem\.out\.println\b/m.test(c)) return "java";
  if (/\{[^}]*:[^}]*;\s*\}/m.test(c)) return "css";
  return "text";
}

function extractFunctions(code, lang) {
  const out = [];
  const c = String(code || "");
  const patterns = {
    javascript: /function\s+([A-Za-z_$][\w$]*)\s*\(|([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>/g,
    python: /def\s+([A-Za-z_]\w*)\s*\(/g,
    java: /(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(/g,
    cpp: /(?:[\w:<>~]+)\s+([A-Za-z_]\w*)\s*\([^;{]*\)\s*\{/g,
  };
  const re = patterns[lang] || patterns.javascript;
  let m;
  while ((m = re.exec(c)) !== null) {
    const name = m[1] || m[2];
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= 10) break;
  }
  return out;
}

function explainCode() {
  const code = String(input?.value || "").trim();
  if (!code) {
    showStatus("Paste code first.", true);
    return;
  }
  const selected = language?.value || "auto";
  const lang = selected === "auto" ? detectLanguage(code) : selected;
  const lines = code.split(/\r?\n/).length;
  const funcs = extractFunctions(code, lang);

  const result = [
    "Overview",
    `This appears to be ${lang.toUpperCase()} code with about ${lines} lines. The snippet defines logic that processes input, applies conditions, and produces output based on the provided rules.`,
    "",
    "Step-by-step explanation",
    "1. The code initializes variables, imports, or setup blocks.",
    "2. It defines reusable logic (functions/classes/selectors) for core behavior.",
    "3. It applies conditions or loops to transform data or handle control flow.",
    "4. It returns, renders, or prints the final result.",
    "",
    "Key functions used",
    funcs.length ? `- ${funcs.join("\n- ")}` : "- No explicit named functions detected in this snippet.",
  ].join("\n");

  setText(output, result);
  showStatus("Explanation generated.");
  window.ToolboxTracking?.trackRun("code-explainer", "explain");
}

explainBtn?.addEventListener("click", explainCode);

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
  if (input) input.value = "";
  if (language) language.value = "auto";
  setText(output, "");
  showStatus("");
});
