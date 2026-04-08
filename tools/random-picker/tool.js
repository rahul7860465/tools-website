import { qs, setText } from "../../js/toolkit.js";

const input = qs("#input");
const count = qs("#count");
const output = qs("#output");
const pickBtn = qs("#pick");
const clearBtn = qs("#clear");
const status = qs("#status");

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function pick() {
  const lines = String(input?.value || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const n = Math.max(1, Number(count?.value || 1));
  if (!lines.length) {
    setText(output, "");
    show("Add at least one item.", true);
    return;
  }
  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, Math.min(n, shuffled.length));
  setText(output, picked.map((x, i) => `${i + 1}. ${x}`).join("\n"));
  show("");
}

pickBtn?.addEventListener("click", pick);
clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  if (count) count.value = "1";
  setText(output, "");
  show("");
});
