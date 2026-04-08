import { qs, setText } from "../../js/toolkit.js";

const input = qs("#input");
const output = qs("#output");
const runBtn = qs("#run");
const clearBtn = qs("#clear");
const status = qs("#status");

function gradeFromPercent(p) {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function calculate() {
  const lines = String(input?.value || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) {
    setText(output, "");
    show("Enter at least one marks line like 80/100.", true);
    return;
  }
  let obtained = 0;
  let total = 0;
  for (const line of lines) {
    const m = line.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (!m) {
      setText(output, "");
      show(`Invalid line: "${line}". Use obtained/total format.`, true);
      return;
    }
    obtained += Number(m[1]);
    total += Number(m[2]);
  }
  if (!(total > 0)) {
    setText(output, "");
    show("Total marks must be greater than 0.", true);
    return;
  }
  const percent = (obtained / total) * 100;
  const letter = gradeFromPercent(percent);
  setText(output, `Obtained: ${obtained.toFixed(2)}\nTotal: ${total.toFixed(2)}\nPercentage: ${percent.toFixed(2)}%\nGrade: ${letter}`);
  show("");
}

runBtn?.addEventListener("click", calculate);
clearBtn?.addEventListener("click", () => {
  if (input) input.value = "";
  setText(output, "");
  show("");
});
