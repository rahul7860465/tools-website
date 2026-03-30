// Lazy-load per-tool logic to keep first paint fast.
// Each tool page should include this file instead of directly loading ./tool.js.

function showLoaderError(message) {
  const status = document.getElementById("status");
  if (!status) return;
  status.style.display = "";
  status.style.borderColor = "rgba(255,120,120,.35)";
  status.style.background = "rgba(255,120,120,.10)";
  status.textContent = message;
}

async function loadToolModule() {
  try {
    // Load tool.js relative to the CURRENT PAGE (not relative to this file).
    const url = new URL("./tool.js", window.location.href).toString();
    await import(url);
  } catch (e) {
    // Log full details for debugging, but don't show raw errors to users.
    try {
      console.error("[Toolbox:tool-loader]", e);
    } catch {
      // ignore
    }

    const isFile = window.location.protocol === "file:";
    showLoaderError(
      isFile
        ? "Tool failed to load. Please open this site using a local server (e.g. run “npm run preview” from the project folder)."
        : "Tool failed to load. Please refresh the page."
    );
  }
}

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => loadToolModule(), { timeout: 1500 });
} else {
  setTimeout(() => loadToolModule(), 0);
}

