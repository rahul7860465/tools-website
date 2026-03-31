import { qs } from "../../js/toolkit.js";

const titleInput = qs("#title-input");
const urlInput = qs("#url-input");
const descInput = qs("#desc-input");
const pTitle = qs("#p-title");
const pUrl = qs("#p-url");
const pDesc = qs("#p-desc");
const clearBtn = qs("#clear");

function sync() {
  if (pTitle) pTitle.textContent = (titleInput?.value || "Sample title").slice(0, 65);
  if (pUrl) pUrl.textContent = (urlInput?.value || "https://example.com/page").slice(0, 80);
  if (pDesc) pDesc.textContent = (descInput?.value || "Sample meta description appears here.").slice(0, 170);
  window.ToolboxTracking?.trackRun("serp-preview", "preview");
}

titleInput?.addEventListener("input", sync);
urlInput?.addEventListener("input", sync);
descInput?.addEventListener("input", sync);

clearBtn?.addEventListener("click", () => {
  if (titleInput) titleInput.value = "";
  if (urlInput) urlInput.value = "";
  if (descInput) descInput.value = "";
  sync();
});

sync();
