import { qs, setText } from "../../js/toolkit.js";

const age = qs("#age");
const weight = qs("#weight");
const height = qs("#height");
const gender = qs("#gender");
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
  const a = Number(age?.value || 0);
  const w = Number(weight?.value || 0);
  const h = Number(height?.value || 0);
  const g = String(gender?.value || "male");
  if (!(a > 0) || !(w > 0) || !(h > 0)) {
    setText(output, "");
    show("Age, weight, and height must be greater than 0.", true);
    return;
  }
  const base = 10 * w + 6.25 * h - 5 * a;
  const bmr = g === "female" ? base - 161 : base + 5;
  setText(
    output,
    `BMR: ${bmr.toFixed(0)} kcal/day\n\nEstimated daily calories:\nSedentary: ${(bmr * 1.2).toFixed(0)}\nLight activity: ${(bmr * 1.375).toFixed(0)}\nModerate activity: ${(bmr * 1.55).toFixed(0)}`
  );
  show("");
}

runBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (age) age.value = "25";
  if (weight) weight.value = "70";
  if (height) height.value = "170";
  if (gender) gender.value = "male";
  setText(output, "");
  show("");
});
