import { qs, setText } from "../../js/toolkit.js";

const tabs = Array.from(document.querySelectorAll(".tab"));
const amount = qs("#amount");
const rate = qs("#rate");
const output = qs("#output");
const calcBtn = qs("#calc");
const clearBtn = qs("#clear");
const status = qs("#status");
let mode = "add";

function show(msg, err = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = err ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = err ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function calc() {
  const a = Number(amount?.value || 0);
  const r = Number(rate?.value || 0);
  if (!(a >= 0) || !(r >= 0)) {
    setText(output, "");
    show("Please enter valid values.", true);
    return;
  }
  if (mode === "add") {
    const gst = (a * r) / 100;
    setText(output, `GST Amount: ${gst.toFixed(2)}\nTotal (incl. GST): ${(a + gst).toFixed(2)}`);
  } else {
    const base = a / (1 + r / 100);
    const gst = a - base;
    setText(output, `Base Amount: ${base.toFixed(2)}\nGST Portion: ${gst.toFixed(2)}`);
  }
  show("");
}

tabs.forEach((t) =>
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");
    mode = t.getAttribute("data-mode") || "add";
    calc();
  })
);

calcBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (amount) amount.value = "1000";
  if (rate) rate.value = "18";
  show("");
  calc();
});

calc();
