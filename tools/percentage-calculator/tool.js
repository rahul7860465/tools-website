import { qs, setText } from "../../js/toolkit.js";

const tabs = Array.from(document.querySelectorAll(".tab"));
const aEl = qs("#a");
const bEl = qs("#b");
const output = qs("#output");
const calcBtn = qs("#calc");
const clearBtn = qs("#clear");
const status = qs("#status");
let mode = "of";

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function calc() {
  const a = Number(aEl?.value || 0);
  const b = Number(bEl?.value || 0);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    setText(output, "");
    show("Please enter valid numbers.", true);
    return;
  }
  let text = "";
  if (mode === "of") {
    text = `${a}% of ${b} = ${(a / 100) * b}`;
  } else if (mode === "change") {
    text = `${a} changed by ${b}% = ${a * (1 + b / 100)}`;
  } else {
    if (a === 0) {
      setText(output, "");
      show("Value A cannot be 0 for difference mode.", true);
      return;
    }
    text = `Difference from ${a} to ${b} = ${(((b - a) / a) * 100).toFixed(2)}%`;
  }
  setText(output, text);
  show("");
}

tabs.forEach((t) =>
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");
    mode = t.getAttribute("data-mode") || "of";
    calc();
  })
);

calcBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (aEl) aEl.value = "20";
  if (bEl) bEl.value = "200";
  show("");
  calc();
});

calc();
