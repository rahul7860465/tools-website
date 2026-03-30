import { qs, setText, copyText, flashCopied } from "../../js/toolkit.js";

const input = qs("#input");
const out = qs("#output");
const status = qs("#status");
const runBtn = qs("#run");
const copyBtn = qs("#copy");
const clearBtn = qs("#clear");

const MAX_INPUT_CHARS = 200;
const MAX_OUTPUT_CHARS = 12000;

function show(msg, isError = false) {
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

function parseField(field, min, max, name) {
  const f = String(field ?? "").trim();
  if (!f) throw new Error(`Missing ${name}.`);
  const out = new Set();

  const parts = f.split(",");
  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;

    // Step: */n or a-b/n
    const [base, stepStr] = part.split("/");
    const step = stepStr ? Number(stepStr) : null;
    if (stepStr && (!Number.isFinite(step) || step <= 0 || step > 1000)) throw new Error(`Invalid step in ${name}.`);

    const addRange = (a, b) => {
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let v = start; v <= end; v++) {
        if (v < min || v > max) continue;
        if (step && ((v - start) % step !== 0)) continue;
        out.add(v);
      }
    };

    if (base === "*") {
      addRange(min, max);
      continue;
    }

    if (base.includes("-")) {
      const [aStr, bStr] = base.split("-");
      const a = Number(aStr);
      const b = Number(bStr);
      if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error(`Invalid range in ${name}.`);
      addRange(a, b);
      continue;
    }

    const single = Number(base);
    if (!Number.isFinite(single)) throw new Error(`Invalid value in ${name}.`);
    if (single < min || single > max) throw new Error(`${name} out of range (${min}-${max}).`);
    out.add(single);
  }

  if (!out.size) throw new Error(`No valid values for ${name}.`);
  return Array.from(out).sort((a, b) => a - b);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmt(dt) {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function nextRuns(expr, count = 10) {
  const fields = String(expr).trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron must have 5 fields: min hour dom mon dow.");
  const [minF, hourF, domF, monF, dowF] = fields;

  const mins = parseField(minF, 0, 59, "minute");
  const hours = parseField(hourF, 0, 23, "hour");
  const dom = parseField(domF, 1, 31, "day-of-month");
  const mon = parseField(monF, 1, 12, "month");
  const dow = parseField(dowF, 0, 6, "day-of-week");

  const results = [];
  let t = new Date();
  t.setSeconds(0, 0);
  t = new Date(t.getTime() + 60_000); // start from next minute

  // Brute force with safeguards (small count).
  const maxIterations = 525600; // ~ 1 year of minutes
  let iter = 0;
  while (results.length < count && iter < maxIterations) {
    iter++;
    const m = t.getMinutes();
    const h = t.getHours();
    const day = t.getDate();
    const month = t.getMonth() + 1;
    const weekday = t.getDay();

    const ok =
      mins.includes(m) &&
      hours.includes(h) &&
      dom.includes(day) &&
      mon.includes(month) &&
      dow.includes(weekday);

    if (ok) results.push(new Date(t));
    t = new Date(t.getTime() + 60_000);
  }

  if (!results.length) throw new Error("No upcoming runs found (try a broader cron).");
  return results;
}

function run() {
  try {
    show("");
    const expr = input.value ?? "";
    if (!expr.trim()) {
      setText(out, "");
      return show("Paste a cron expression first.", true);
    }
    if (expr.length > MAX_INPUT_CHARS) {
      setText(out, "");
      return show(`Input too large (max ${MAX_INPUT_CHARS} chars).`, true);
    }

    const runs = nextRuns(expr, 12);
    const text = `Valid cron.\nNext runs:\n${runs.map((d) => fmt(d)).join("\n")}\n`;
    if (text.length > MAX_OUTPUT_CHARS) {
      setText(out, "");
      return show("Output too large to display.", true);
    }
    setText(out, text);
    show("Validated.");
    window.ToolboxTracking?.trackRun("cron-helper", "preview");
  } catch (e) {
    setText(out, "");
    show(e instanceof Error ? e.message : "Failed to process cron.", true);
  }
}

runBtn.addEventListener("click", run);
copyBtn.addEventListener("click", async () => {
  try {
    const text = out.textContent || "";
    if (!text) return show("Nothing to copy.", true);
    await copyText(text);
    show("Copied!");
    flashCopied(out);
    window.setTimeout(() => {
      if ((status.textContent || "").trim() === "Copied!") show("");
    }, 1200);
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to copy output.", true);
  }
});
clearBtn.addEventListener("click", () => {
  try {
    input.value = "";
    setText(out, "");
    show("");
  } catch (e) {
    show(e instanceof Error ? e.message : "Failed to clear.", true);
  }
});

