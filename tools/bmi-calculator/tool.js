import { qs, setText } from "../../js/toolkit.js";

const height = qs("#height");
const weight = qs("#weight");
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

function category(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function calc() {
  const h = Number(height?.value || 0);
  const w = Number(weight?.value || 0);
  if (!(h > 0) || !(w > 0)) {
    setText(output, "");
    show("Please enter valid height and weight.", true);
    return;
  }
  const m = h / 100;
  const bmi = w / (m * m);
  setText(output, `BMI: ${bmi.toFixed(2)}\nCategory: ${category(bmi)}`);
  show("");
  window.ToolboxTracking?.trackRun("bmi-calculator", "calculate");
}

calcBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (height) height.value = "170";
  if (weight) weight.value = "70";
  show("");
  calc();
});

calc();
