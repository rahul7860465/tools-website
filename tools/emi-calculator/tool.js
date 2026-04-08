import { qs, setText } from "../../js/toolkit.js";

const principal = qs("#principal");
const rate = qs("#rate");
const months = qs("#months");
const output = qs("#output");
const calcBtn = qs("#calc");
const clearBtn = qs("#clear");
const status = qs("#status");

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function money(v) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v);
}

function calc() {
  const p = Number(principal?.value || 0);
  const annual = Number(rate?.value || 0);
  const n = Number(months?.value || 0);
  if (!(p > 0) || !(annual >= 0) || !(n > 0)) {
    setText(output, "");
    show("Please enter valid amount, rate, and tenure.", true);
    return;
  }
  const r = annual / 12 / 100;
  const emi = r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const total = emi * n;
  const interest = total - p;
  setText(output, `Monthly EMI: ${money(emi)}\nTotal Interest: ${money(interest)}\nTotal Payable: ${money(total)}`);
  show("");
  window.ToolboxTracking?.trackRun("emi-calculator", "calculate");
}

calcBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (principal) principal.value = "500000";
  if (rate) rate.value = "10";
  if (months) months.value = "60";
  show("");
  calc();
});

calc();
