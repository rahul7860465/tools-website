import { qs, setText } from "../../js/toolkit.js";

const dob = qs("#dob");
const ondate = qs("#ondate");
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

function calculate() {
  const d1 = dob?.value ? new Date(dob.value) : null;
  const d2 = ondate?.value ? new Date(ondate.value) : new Date();
  if (!d1 || Number.isNaN(d1.getTime())) {
    setText(output, "");
    show("Select a valid date of birth.", true);
    return;
  }
  if (d1 > d2) {
    setText(output, "");
    show("Date of birth cannot be in the future.", true);
    return;
  }

  let y = d2.getFullYear() - d1.getFullYear();
  let m = d2.getMonth() - d1.getMonth();
  let d = d2.getDate() - d1.getDate();
  if (d < 0) {
    m -= 1;
    const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0).getDate();
    d += prevMonth;
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  const totalDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  setText(output, `Age: ${y} years, ${m} months, ${d} days\nTotal days: ${totalDays}`);
  show("");
}

calcBtn?.addEventListener("click", calculate);
clearBtn?.addEventListener("click", () => {
  if (dob) dob.value = "";
  if (ondate) ondate.value = "";
  setText(output, "");
  show("");
});

if (ondate && !ondate.value) ondate.value = new Date().toISOString().slice(0, 10);
