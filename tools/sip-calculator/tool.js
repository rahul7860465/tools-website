import { qs, setText } from "../../js/toolkit.js";

const amount = qs("#amount");
const rate = qs("#rate");
const years = qs("#years");
const output = qs("#output");
const runBtn = qs("#run");
const clearBtn = qs("#clear");
const status = qs("#status");

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function calc() {
  const p = Number(amount?.value || 0);
  const r = Number(rate?.value || 0) / 12 / 100;
  const n = Number(years?.value || 0) * 12;
  if (!(p > 0) || !(n > 0)) {
    setText(output, "");
    show("Investment and years must be greater than 0.", true);
    return;
  }
  const futureValue = p * (((1 + r) ** n - 1) / r) * (1 + r);
  const invested = p * n;
  const gains = futureValue - invested;
  setText(output, `Total invested: ${invested.toFixed(2)}\nEstimated value: ${futureValue.toFixed(2)}\nEstimated gains: ${gains.toFixed(2)}`);
  show("");
}

runBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (amount) amount.value = "5000";
  if (rate) rate.value = "12";
  if (years) years.value = "10";
  setText(output, "");
  show("");
});
