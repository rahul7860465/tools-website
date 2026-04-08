import { qs, setText } from "../../js/toolkit.js";

const price = qs("#price");
const discount = qs("#discount");
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

function calc() {
  const p = Number(price?.value || 0);
  const d = Number(discount?.value || 0);
  if (!(p >= 0) || !(d >= 0)) {
    setText(output, "");
    show("Please enter valid values.", true);
    return;
  }
  const discountAmt = (p * d) / 100;
  const finalPrice = p - discountAmt;
  setText(output, `Discount Amount: ${discountAmt.toFixed(2)}\nFinal Price: ${finalPrice.toFixed(2)}`);
  show("");
}

calcBtn?.addEventListener("click", calc);
clearBtn?.addEventListener("click", () => {
  if (price) price.value = "1000";
  if (discount) discount.value = "10";
  show("");
  calc();
});

calc();
