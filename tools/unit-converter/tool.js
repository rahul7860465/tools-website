import { qs, setText } from "../../js/toolkit.js";

const tabs = Array.from(document.querySelectorAll(".tab"));
const valueEl = qs("#value");
const fromEl = qs("#from");
const toEl = qs("#to");
const output = qs("#output");
const clearBtn = qs("#clear");

const defs = {
  length: { m: 1, km: 1000, cm: 0.01, in: 0.0254, ft: 0.3048 },
  weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495 },
  data: { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 },
  time: { s: 1, min: 60, hr: 3600, day: 86400 },
};

let tab = "length";

function setUnits() {
  const units = tab === "temp" ? ["c", "f", "k"] : Object.keys(defs[tab]);
  fromEl.innerHTML = "";
  toEl.innerHTML = "";
  for (const u of units) {
    const o1 = document.createElement("option");
    o1.value = u;
    o1.textContent = u.toUpperCase();
    const o2 = o1.cloneNode(true);
    fromEl.appendChild(o1);
    toEl.appendChild(o2);
  }
  toEl.selectedIndex = Math.min(1, units.length - 1);
}

function convertTemp(v, f, t) {
  let c = v;
  if (f === "f") c = (v - 32) * (5 / 9);
  if (f === "k") c = v - 273.15;
  if (t === "c") return c;
  if (t === "f") return c * (9 / 5) + 32;
  return c + 273.15;
}

function recalc() {
  const v = Number(valueEl?.value || 0);
  const f = fromEl?.value || "";
  const t = toEl?.value || "";
  if (tab === "temp") {
    setText(output, `${v} ${f.toUpperCase()} = ${convertTemp(v, f, t).toFixed(4)} ${t.toUpperCase()}`);
    return;
  }
  const map = defs[tab];
  const res = (v * map[f]) / map[t];
  setText(output, `${v} ${f.toUpperCase()} = ${res.toFixed(6)} ${t.toUpperCase()}`);
}

tabs.forEach((b) =>
  b.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("is-active"));
    b.classList.add("is-active");
    tab = b.getAttribute("data-tab") || "length";
    setUnits();
    recalc();
    window.ToolboxTracking?.trackRun("unit-converter", tab);
  })
);

valueEl?.addEventListener("input", recalc);
fromEl?.addEventListener("change", recalc);
toEl?.addEventListener("change", recalc);
clearBtn?.addEventListener("click", () => {
  if (valueEl) valueEl.value = "1";
  recalc();
});

setUnits();
recalc();
