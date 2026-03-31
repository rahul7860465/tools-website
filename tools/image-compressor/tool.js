import { qs, setText } from "../../js/toolkit.js";

const fileInput = qs("#file");
const qualityInput = qs("#quality");
const output = qs("#output");
const status = qs("#status");
const compressBtn = qs("#compress");
const downloadBtn = qs("#download");
const clearBtn = qs("#clear");

let downloadBlob = null;

function show(msg, isError = false) {
  if (!status) return;
  status.style.display = msg ? "" : "none";
  status.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(106,166,255,.25)";
  status.style.background = isError ? "rgba(255,120,120,.10)" : "rgba(106,166,255,.08)";
  setText(status, msg);
}

async function compress() {
  const file = fileInput?.files?.[0];
  if (!file) return show("Upload an image first.", true);
  const quality = Math.max(0.1, Math.min(1, Number(qualityInput?.value || 0.7)));
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return show("Canvas not supported.", true);
  ctx.drawImage(img, 0, 0);
  const type = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
  URL.revokeObjectURL(url);
  if (!blob) return show("Compression failed.", true);
  if (downloadBlob) URL.revokeObjectURL(downloadBlob);
  downloadBlob = URL.createObjectURL(blob);
  const oldSize = file.size;
  const newSize = blob.size;
  const reduction = oldSize > 0 ? (((oldSize - newSize) / oldSize) * 100).toFixed(2) : "0.00";
  setText(output, `Original size: ${(oldSize / 1024).toFixed(2)} KB\nCompressed size: ${(newSize / 1024).toFixed(2)} KB\nSize reduction: ${reduction}%`);
  show("Image compressed.");
  window.ToolboxTracking?.trackRun("image-compressor", "compress");
}

compressBtn?.addEventListener("click", () => compress().catch(() => show("Compression failed.", true)));

downloadBtn?.addEventListener("click", () => {
  if (!downloadBlob) return show("Compress an image first.", true);
  const a = document.createElement("a");
  a.href = downloadBlob;
  a.download = "compressed-image";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

clearBtn?.addEventListener("click", () => {
  if (fileInput) fileInput.value = "";
  if (downloadBlob) {
    URL.revokeObjectURL(downloadBlob);
    downloadBlob = null;
  }
  setText(output, "");
  show("");
});
