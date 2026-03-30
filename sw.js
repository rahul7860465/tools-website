/* eslint-disable no-restricted-globals */
const CACHE_NAME = "toolbox-static-v3";

// Minimal pre-cache. Tool pages and assets will be cached on-demand.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/main.js",
  "./js/toolkit.js",
  "./js/tool-loader.js",
  "./tools.json",
  "./featureFlags.json",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      self.clients.claim();
    })()
  );
});

function isSameOrigin(reqUrl) {
  try {
    return new URL(reqUrl).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!isSameOrigin(req.url)) return;
  const url = new URL(req.url);

  // Network-first for dynamic app shell data and documents to avoid stale UI.
  const networkFirst =
    req.mode === "navigate" ||
    url.pathname.endsWith("/tools.json") ||
    url.pathname.endsWith("/featureFlags.json") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/js/main.js") ||
    url.pathname.endsWith("/css/styles.css");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (networkFirst) {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "default")) {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const fallback = await cache.match(req);
          if (fallback) return fallback;
          if (req.mode === "navigate") {
            const indexFallback = await cache.match("./index.html");
            if (indexFallback) return indexFallback;
          }
          throw new Error("Network unavailable and no cached response.");
        }
      }

      const cached = await cache.match(req);
      if (cached) {
        // Refresh in background for cache-first assets.
        fetch(req)
          .then((fresh) => {
            if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "default")) {
              cache.put(req, fresh.clone());
            }
          })
          .catch(() => {
            // ignore background refresh errors
          });
        return cached;
      }

      try {
        const res = await fetch(req);
        // Cache successful, basic responses.
        if (res && res.ok && (res.type === "basic" || res.type === "default")) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // Offline fallback: return cached index for navigations.
        if (req.mode === "navigate") {
          const fallback = await cache.match("./index.html");
          if (fallback) return fallback;
        }
        throw e;
      }
    })()
  );
});

