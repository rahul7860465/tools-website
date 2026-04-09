(() => {
  const USER_FRIENDLY_ERROR = "Something went wrong. Please try again.";

  // ---- Tool Registry + Feature Flags ----
  function getSiteRootUrl() {
    const pathname = String(window.location.pathname || "/");
    // Tool pages: /<repo>/tools/<slug>/index.html -> root is ../../
    if (/\/tools\/[^/]+\//.test(pathname)) return new URL("../../", window.location.href);
    // Home / other root-level pages in this site.
    return new URL("./", window.location.href);
  }
  const SITE_ROOT_URL = getSiteRootUrl();
  const REGISTRY_URL = new URL("tools.json", SITE_ROOT_URL).toString();
  const FLAGS_URL = new URL("featureFlags.json", SITE_ROOT_URL).toString();

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return await res.json();
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  function toolSlugFromPath(pathname) {
    const m = String(pathname || "").match(/\/tools\/([^/]+)\//);
    return m ? m[1] : null;
  }

  function applyToolFlags(tools, flags) {
    const enabledMap = flags?.tools && typeof flags.tools === "object" ? flags.tools : {};
    const premiumMap = flags?.premiumTools && typeof flags.premiumTools === "object" ? flags.premiumTools : {};
    return tools
      .map((t) => ({
        ...t,
        enabled: enabledMap[t.id] ?? t.enabled ?? true,
        premium: premiumMap[t.id] ?? t.premium ?? false,
      }))
      .filter((t) => t.enabled);
  }

  const ICONS = {
    json: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l-6 8 6 8" /><path d="M15 4l6 8-6 8" /><path d="M10 20h4" /></svg>`,
    base64: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><path d="M8 14l2-4 2 4 2-6 2 6" /></svg>`,
    password: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10V8a5 5 0 0 1 10 0v2" /><rect x="6" y="10" width="12" height="10" rx="2" /><path d="M12 15v2" /></svg>`,
    uuid: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M4 9h3" /><path d="M4 15h3" /><path d="M17 9h3" /><path d="M17 15h3" /></svg>`,
    url: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0 0-7.07" /><path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 0 7.07" /><path d="M9 12h6" /></svg>`,
    case: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2" /><path d="M9 19l3-14 3 14" /></svg>`,
    regex: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6L6 10l4 4" /><path d="M14 6l4 4-4 4" /><path d="M12 7l-1 10" /></svg>`,
    jwt: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" /><path d="M9 12l2 2 4-5" /></svg>`,
    time: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></svg>`,
    html: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-4 5 4 5" /><path d="M16 7l4 5-4 5" /><path d="M14 5l-4 14" /></svg>`
    ,
    code: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l-4 3 4 3" /><path d="M16 9l4 3-4 3" /><path d="M14 6l-4 12" /></svg>`
  };

  // ---- Usage tracking (localStorage + in-browser analytics events) ----
  const STATS_KEY = "toolbox_stats_v1";
  const FAVORITES_KEY = "toolbox_favorites_v1";
  const DENSITY_KEY = "toolbox_density_v1";
  const PLAN_KEY = "toolbox_plan_v1";
  const CAPSULES_KEY = "toolbox_capsules_v1";
  const WORKSPACE_SESSION_KEY = "toolbox_workspace_session_v1";
  const THEME_PRESET_KEY = "toolbox_theme_preset_v1";
  const FUN_MODE_KEY = "toolbox_fun_mode_v1";
  const AGENT_MEMORY_KEY = "toolbox_agent_memory_v1";
  const AGENT_PROFILE_KEY = "toolbox_agent_profile_v1";

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return { visits: {}, toolRuns: {}, toolActions: {} };
      const parsed = JSON.parse(raw);
      return {
        visits: parsed?.visits && typeof parsed.visits === "object" ? parsed.visits : {},
        toolRuns: parsed?.toolRuns && typeof parsed.toolRuns === "object" ? parsed.toolRuns : {},
        toolActions: parsed?.toolActions && typeof parsed.toolActions === "object" ? parsed.toolActions : {},
      };
    } catch {
      return { visits: {}, toolRuns: {}, toolActions: {} };
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore (private mode / quota / blocked)
    }
  }

  function inc(obj, key, by = 1) {
    if (!key) return;
    obj[key] = (Number(obj[key]) || 0) + by;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }
  function saveFavorites(set) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  }

  function loadWorkspaceSession() {
    try {
      const raw = localStorage.getItem(WORKSPACE_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        query: String(parsed?.query || ""),
        category: String(parsed?.category || "all"),
      };
    } catch {
      return { query: "", category: "all" };
    }
  }

  function saveWorkspaceSession(query, category) {
    try {
      localStorage.setItem(
        WORKSPACE_SESSION_KEY,
        JSON.stringify({
          query: String(query || ""),
          category: String(category || "all"),
          ts: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }

  function getPlan() {
    try {
      const p = localStorage.getItem(PLAN_KEY);
      return p === "pro" || p === "team" ? p : "free";
    } catch {
      return "free";
    }
  }
  function setPlan(plan) {
    const p = plan === "pro" || plan === "team" ? plan : "free";
    try {
      localStorage.setItem(PLAN_KEY, p);
    } catch {
      // ignore
    }
    document.documentElement.dataset.plan = p;
    return p;
  }

  function sendAnalyticsEvent(type, payload) {
    const detail = {
      type,
      payload: payload || {},
      ts: Date.now(),
    };

    // Log for debugging.
    try {
      console.info("[Toolbox:analytics]", detail);
    } catch {
      // ignore
    }

    // Dispatch an event so you can plug in AdSense/GA later.
    try {
      window.dispatchEvent(new CustomEvent("toolbox:analytics", { detail }));
    } catch {
      // ignore
    }
  }

  const ToolboxTracking = {
    trackPageVisit() {
      const stats = loadStats();
      const slug = toolSlugFromPath(window.location.pathname);
      const key = slug ? `tool:${slug}` : `page:${window.location.pathname || "/"}`;
      inc(stats.visits, key, 1);
      saveStats(stats);
      sendAnalyticsEvent("page_visit", { key, slug: slug || undefined, path: window.location.pathname || "/" });
      return stats;
    },
    trackRun(toolSlug, action = "run") {
      const stats = loadStats();
      if (toolSlug) inc(stats.toolRuns, toolSlug, 1);
      if (toolSlug) inc(stats.toolActions, `${toolSlug}:${action}`, 1);
      saveStats(stats);
      sendAnalyticsEvent("tool_run", { tool: toolSlug, action });
      return stats;
    },
    getStats() {
      return loadStats();
    },
    getMostUsedTool() {
      const stats = loadStats();
      let best = null;
      let bestCount = -1;
      for (const [k, v] of Object.entries(stats.toolRuns || {})) {
        const n = Number(v) || 0;
        if (n > bestCount) {
          bestCount = n;
          best = k;
        }
      }
      return best ? { tool: best, runs: bestCount } : null;
    },
    reset() {
      try {
        localStorage.removeItem(STATS_KEY);
      } catch {
        // ignore
      }
    },
  };

  window.ToolboxTracking = ToolboxTracking;
  ToolboxTracking.trackPageVisit();

  // ---- Theme toggle (dark/light) ----
  const THEME_KEY = "toolbox_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // ignore
    }
    return t;
  }

  function ensureThemeToggle() {
    const headerRow = document.querySelector(".site-header .header-row");
    if (!headerRow) return;
    if (document.getElementById("theme-toggle")) return;

    const nav = headerRow.querySelector(".site-nav");
    if (!nav) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "theme-toggle";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "Toggle dark/light mode");

    const syncLabel = () => {
      const cur = document.documentElement.dataset.theme || "dark";
      btn.textContent = cur === "light" ? "Dark mode" : "Light mode";
      btn.setAttribute("aria-pressed", cur === "light" ? "true" : "false");
    };

    btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || "dark";
      applyTheme(cur === "light" ? "dark" : "light");
      syncLabel();
    });

    // Insert at end of nav.
    nav.appendChild(btn);
    syncLabel();
  }

  applyTheme(getPreferredTheme());
  ensureThemeToggle();

  function ensurePricingLink() {
    const nav = document.querySelector(".site-header .site-nav");
    if (!nav) return;
    const hasPricing = Array.from(nav.querySelectorAll("a")).some((a) => /pricing\.html(?:$|\?)/.test(a.getAttribute("href") || ""));
    if (hasPricing) return;
    const a = document.createElement("a");
    a.href = toolSlugFromPath(window.location.pathname) ? "../../pricing.html" : "./pricing.html";
    a.textContent = "Pricing";
    nav.appendChild(a);
  }
  ensurePricingLink();

  function ensurePlanBadge() {
    const nav = document.querySelector(".site-header .site-nav");
    if (!nav) return;
    let badge = document.getElementById("plan-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "plan-badge";
      badge.className = "plan-badge";
      nav.appendChild(badge);
    }
    const plan = getPlan();
    badge.textContent = `Plan: ${plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Team"}`;
  }
  setPlan(getPlan());
  ensurePlanBadge();

  // ---- Share buttons (tool pages) ----
  function copyToClipboard(text) {
    const value = String(text ?? "");
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.left = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand && document.execCommand("copy");
        ta.remove();
        if (!ok) return reject(new Error("Copy not supported."));
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Copy failed."));
      }
    });
  }

  function ensureShareBar() {
    const slug = toolSlugFromPath(window.location.pathname);
    if (!slug) return;

    const head = document.querySelector(".tool-head");
    if (!head) return;

    const bar = document.getElementById("share-bar") || (() => {
      const div = document.createElement("div");
      div.id = "share-bar";
      div.className = "share-bar";
      div.setAttribute("aria-label", "Share this tool");
      head.appendChild(div);
      return div;
    })();

    if (bar.dataset.ready === "1") return;
    bar.dataset.ready = "1";

    const url = window.location.href;
    const title = document.title || "Toolbox Tool";
    const text = `Check out this tool: ${title}`;

    const enc = encodeURIComponent;
    const xUrl = `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`;
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
    const waUrl = `https://wa.me/?text=${enc(`${text}\n${url}`)}`;

    const mkBtn = (label, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    };

    const mkLink = (label, href) => {
      const a = document.createElement("a");
      a.className = "btn";
      a.textContent = label;
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return a;
    };

    bar.appendChild(
      mkBtn("Copy link", async () => {
        try {
          await copyToClipboard(url);
          const status = document.getElementById("status");
          if (status && !status.textContent.trim()) {
            status.style.display = "";
            status.style.borderColor = "rgba(106,166,255,.25)";
            status.style.background = "rgba(106,166,255,.08)";
            status.textContent = "Copied!";
            window.setTimeout(() => {
              if ((status.textContent || "").trim() === "Copied!") status.textContent = "";
              if (!(status.textContent || "").trim()) status.style.display = "none";
            }, 1200);
          }
        } catch {
          // ignore (status area will show generic monitor message if needed)
        }
      })
    );

    if (navigator.share) {
      bar.appendChild(
        mkBtn("Share…", async () => {
          try {
            await navigator.share({ title, text, url });
          } catch {
            // user cancelled or unsupported
          }
        })
      );
    }

    bar.appendChild(mkLink("Share on X", xUrl));
    bar.appendChild(mkLink("Share on LinkedIn", liUrl));
    bar.appendChild(mkLink("Share on WhatsApp", waUrl));
  }

  function showTopBanner(message) {
    if (!message) return;
    if (document.getElementById("toolbox-banner")) return;
    const banner = document.createElement("div");
    banner.id = "toolbox-banner";
    banner.className = "notice";
    banner.style.margin = "12px 0";
    banner.textContent = message;
    const container = document.querySelector(".container");
    if (container) container.prepend(banner);
    else document.body.prepend(banner);
  }

  function showFriendlyError() {
    const status = document.getElementById("status");
    if (!status) return;
    // Don't overwrite an existing tool message.
    const current = (status.textContent || "").trim();
    if (current) return;

    status.style.display = "";
    status.style.borderColor = "rgba(255,120,120,.35)";
    status.style.background = "rgba(255,120,120,.10)";
    status.textContent = USER_FRIENDLY_ERROR;
  }

  function logError(kind, payload) {
    try {
      // Centralized console logging for debugging (no network).
      console.error(`[Toolbox:${kind}]`, payload);
    } catch {
      // ignore
    }
  }

  // Capture runtime JS errors (and prevent raw browser error UI where possible).
  window.onerror = (message, source, lineno, colno, error) => {
    logError("error", {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    showFriendlyError();
    return true;
  };

  // Capture unhandled promise rejections.
  window.addEventListener("unhandledrejection", (event) => {
    logError("unhandledrejection", {
      reason: event?.reason,
      stack: event?.reason?.stack,
    });
    showFriendlyError();
    event.preventDefault();
  });

  // Capture resource load failures (script/css/img).
  window.addEventListener(
    "error",
    (event) => {
      const target = event?.target;
      const isResourceError =
        target &&
        (target.tagName === "SCRIPT" || target.tagName === "LINK" || target.tagName === "IMG");
      if (!isResourceError) return;

      logError("resource", {
        tag: target.tagName,
        src: target.src,
        href: target.href,
      });
      showFriendlyError();
    },
    true
  );

  // If opened via file://, ES modules and dynamic imports may be blocked.
  if (window.location.protocol === "file:") {
    showTopBanner(
      "This site needs to be opened via a local server to run tools (browser security blocks module scripts on file://). Run “npm run preview” in the toolbox-site folder and open http://localhost:4173."
    );
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  ensureShareBar();

  let __tools = [];

  function toolById(id) {
    return __tools.find((t) => t.id === id) || null;
  }

  function toolIdFromPath(pathname) {
    return toolSlugFromPath(pathname);
  }

  function iconMarkup(tool) {
    const key = tool?.icon || "";
    return ICONS[key] || ICONS.json;
  }

  function buildCard(tool, { href, showCount, pathIsRelativeToCurrent = false } = {}) {
    const a = document.createElement("a");
    a.className = "card";
    a.setAttribute("role", "listitem");
    a.href = href || (pathIsRelativeToCurrent ? tool.path : new URL(tool.path, SITE_ROOT_URL).toString());
    a.dataset.toolName = tool.name;
    a.dataset.category = tool.category;
    a.dataset.desc = tool.description || "";
    a.dataset.toolId = tool.id || "";

    const tags = [];
    tags.push(`<span class="tag">${escapeHtml(tool.category || "")}</span>`);
    if (tool.premium) tags.push(`<span class="tag">Premium</span>`);
    if (showCount && typeof showCount === "number") tags.push(`<span class="tag">${showCount}</span>`);

    const favs = loadFavorites();
    const isFav = favs.has(tool.id);
    if (isFav) a.classList.add("is-favorite");

    a.innerHTML = `
      <div class="card-icon" aria-hidden="true">${iconMarkup(tool)}</div>
      <div class="card-tools">
        <button class="card-tool-btn" type="button" title="Favorite" data-action="favorite">${isFav ? "★" : "☆"}</button>
        <button class="card-tool-btn" type="button" title="Share" data-action="share">↗</button>
      </div>
      <div class="card-meta">${tags.join("")}</div>
      <h3>${escapeHtml(tool.name || "")}</h3>
      <p>${escapeHtml(tool.description || "")}</p>
      <span class="btn btn-small">Open tool</span>
    `.trim();

    return a;
  }

  function renderHomepageTools() {
    const grid = document.getElementById("tool-grid");
    if (!grid) return;
    grid.innerHTML = "";
    grid.setAttribute("aria-busy", "true");
    for (const t of __tools) {
      grid.appendChild(buildCard(t, { pathIsRelativeToCurrent: true }));
    }
    grid.setAttribute("aria-busy", "false");
  }

  function ensureCategoryOptions() {
    const category = document.getElementById("tool-category");
    if (!category) return;
    // Preserve first option (All categories), then rebuild.
    const allOpt = category.querySelector('option[value="all"]');
    category.innerHTML = "";
    if (allOpt) category.appendChild(allOpt);
    else {
      const opt = document.createElement("option");
      opt.value = "all";
      opt.textContent = "All categories";
      category.appendChild(opt);
    }

    const cats = Array.from(new Set(__tools.map((t) => String(t.category || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      category.appendChild(opt);
    }
  }

  function renderCategoryChips() {
    const root = document.getElementById("category-chips");
    const category = document.getElementById("tool-category");
    if (!root || !category) return;
    const opts = Array.from(category.querySelectorAll("option")).map((o) => ({ value: o.value, label: o.textContent || o.value }));
    root.innerHTML = "";
    for (const o of opts) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.value = o.value;
      b.textContent = o.label;
      if (o.value === String(category.value || "all")) b.classList.add("is-active");
      b.addEventListener("click", () => {
        category.value = o.value;
        category.dispatchEvent(new Event("change"));
      });
      root.appendChild(b);
    }
  }

  function setHighlight(titleEl, rawName, query) {
    if (!titleEl) return;
    if (!query) {
      titleEl.textContent = rawName;
      return;
    }

    const hay = rawName.toLowerCase();
    const needle = query.toLowerCase();
    const idx = hay.indexOf(needle);
    if (idx === -1) {
      titleEl.textContent = rawName;
      return;
    }

    const before = rawName.slice(0, idx);
    const match = rawName.slice(idx, idx + needle.length);
    const after = rawName.slice(idx + needle.length);
    titleEl.innerHTML = `${escapeHtml(before)}<mark class="hit">${escapeHtml(match)}</mark>${escapeHtml(after)}`;
  }

  function wireHomepageFilters() {
    const search = document.getElementById("tool-search");
    const category = document.getElementById("tool-category");
    const grid = document.getElementById("tool-grid");
    const empty = document.getElementById("tool-empty");
    const meta = document.getElementById("tools-meta");
    const pagerMeta = document.getElementById("pager-meta");
    const pagerPrev = document.getElementById("pager-prev");
    const pagerNext = document.getElementById("pager-next");
    const chips = document.getElementById("category-chips");
    const activeFilter = document.getElementById("workspace-active-filter");
    const sessionChips = document.getElementById("workspace-session-chips");
    const pinnedRoot = document.getElementById("workspace-pinned");
    if (!grid || !search) return;

    const cards = Array.from(grid.querySelectorAll("a.card"));
    const titles = cards.map((c) => c.querySelector("h3"));
    const rawNames = cards.map((c, i) => (c.dataset.toolName || titles[i]?.textContent || "").trim());
    const rawDescs = cards.map((c) => (c.dataset.desc || "").trim());
    const cats = cards.map((c) => String(c.dataset.category || "").trim());
    let page = 1;
    const pageSize = 18;
    const savedSession = loadWorkspaceSession();
    if (savedSession.query) search.value = savedSession.query;
    if (category && savedSession.category) category.value = savedSession.category;

    const renderWorkspaceState = () => {
      const q = String(search.value || "").trim();
      const c = category ? String(category.value || "all") : "all";
      if (activeFilter) {
        activeFilter.textContent = c === "all" ? `All tools${q ? ` • "${q}"` : ""}` : `${c}${q ? ` • "${q}"` : ""}`;
      }
      if (sessionChips) {
        const parts = [];
        if (q) parts.push(`<button type="button" class="workspace-chip" data-workspace-action="restore-query">Search: ${escapeHtml(q)}</button>`);
        if (c !== "all") parts.push(`<button type="button" class="workspace-chip" data-workspace-action="restore-category">Category: ${escapeHtml(c)}</button>`);
        parts.push('<button type="button" class="workspace-chip" data-workspace-action="clear-filters">Clear filters</button>');
        sessionChips.innerHTML = parts.join("");
      }
      if (pinnedRoot) {
        const favs = Array.from(loadFavorites()).slice(0, 6);
        if (!favs.length) {
          pinnedRoot.innerHTML = '<span class="muted">Pin tools using the star icon to build your quick workspace.</span>';
        } else {
          pinnedRoot.innerHTML = favs
            .map((id) => {
              const t = toolById(id);
              if (!t) return "";
              return `<a class="workspace-chip" href="./tools/${escapeHtml(t.id)}/index.html">Pinned: ${escapeHtml(t.name)}</a>`;
            })
            .join("");
        }
      }
      saveWorkspaceSession(q, c);
    };

    const apply = () => {
      const q = normalize(search.value);
      const selected = category ? String(category.value || "all") : "all";
      const matchedIndexes = [];
      cards.forEach((c, i) => {
        const hay = normalize(`${rawNames[i]} ${rawDescs[i]}`);
        const matchesText = !q || hay.includes(q);
        const matchesCategory = selected === "all" || cats[i] === selected;
        const show = matchesText && matchesCategory;
        if (show) matchedIndexes.push(i);
        setHighlight(titles[i], rawNames[i], q);
      });

      const visible = matchedIndexes.length;
      const pages = Math.max(1, Math.ceil(visible / pageSize));
      if (page > pages) page = pages;
      if (page < 1) page = 1;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const visibleSet = new Set(matchedIndexes.slice(start, end));

      cards.forEach((c, i) => {
        c.style.display = visibleSet.has(i) ? "" : "none";
      });

      if (empty) empty.style.display = visible ? "none" : "";
      if (meta) {
        const total = cards.length;
        const suffix = total === 1 ? "tool" : "tools";
        meta.textContent = `${visible} of ${total} ${suffix}`;
      }
      if (pagerMeta) pagerMeta.textContent = `Page ${page} of ${pages}`;
      if (pagerPrev) pagerPrev.disabled = page <= 1;
      if (pagerNext) pagerNext.disabled = page >= pages;
      if (chips && category) {
        chips.querySelectorAll(".chip").forEach((el) => {
          el.classList.toggle("is-active", el.getAttribute("data-value") === String(category.value || "all"));
        });
      }
      renderWorkspaceState();
    };

    const resetAndApply = () => {
      page = 1;
      apply();
    };

    search.addEventListener("input", resetAndApply);
    if (category) category.addEventListener("change", resetAndApply);
    if (pagerPrev) {
      pagerPrev.addEventListener("click", () => {
        page -= 1;
        apply();
      });
    }
    if (pagerNext) {
      pagerNext.addEventListener("click", () => {
        page += 1;
        apply();
      });
    }
    grid.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();

      const card = target.closest("a.card");
      if (!card) return;
      const id = card.getAttribute("data-tool-id") || "";
      if (!id) return;

      if (action === "favorite") {
        const favs = loadFavorites();
        if (favs.has(id)) favs.delete(id);
        else favs.add(id);
        saveFavorites(favs);
        const on = favs.has(id);
        target.textContent = on ? "★" : "☆";
        card.classList.toggle("is-favorite", on);
        renderWorkspaceState();
      }
      if (action === "share") {
        const href = card.getAttribute("href");
        if (!href) return;
        const url = new URL(href, window.location.href).toString();
        try {
          if (navigator.share) await navigator.share({ title: card.dataset.toolName || "Tool", url });
          else await copyToClipboard(url);
        } catch {
          // ignore
        }
      }
    });
    sessionChips?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-workspace-action");
      if (!action) return;
      if (action === "restore-query") {
        search.focus();
        search.select?.();
      } else if (action === "restore-category") {
        category?.focus();
      } else if (action === "clear-filters") {
        search.value = "";
        if (category) category.value = "all";
        resetAndApply();
        return;
      }
    });
    apply();
  }

  function renderRelatedTools() {
    const currentId = toolIdFromPath(window.location.pathname);
    if (!currentId) return;

    const current = toolById(currentId);
    const relatedRoot =
      document.getElementById("related-tools") ||
      (() => {
        const main = document.getElementById("main");
        if (!main) return null;
        const section = document.createElement("section");
        section.className = "section";
        section.setAttribute("aria-label", "Related tools");
        section.innerHTML = '<h2>Related Tools</h2><div id="related-tools" class="grid" role="list"></div>';
        main.appendChild(section);
        return section.querySelector("#related-tools");
      })();
    if (!relatedRoot) return;

    const sameCategory = current
      ? __tools.filter((t) => t.category === current.category && t.id !== currentId)
      : [];
    const others = __tools.filter((t) => t.id !== currentId && (!current || t.category !== current.category));
    const pick = [...sameCategory, ...others].slice(0, 5);
    const finalList = pick.slice(0, Math.max(3, Math.min(5, pick.length)));

    relatedRoot.innerHTML = "";
    for (const t of finalList) {
      // From a tool page, registry `path` is relative to site root page; use ../<id>/index.html instead.
      relatedRoot.appendChild(buildCard(t, { href: `../${t.id}/index.html` }));
    }
  }

  function renderPopularTools() {
    const root = document.getElementById("popular-tools");
    if (!root) return;

    const stats = window.ToolboxTracking?.getStats?.() || { toolRuns: {} };
    const runs = stats.toolRuns || {};
    const ranked = Object.entries(runs)
      .map(([slug, count]) => ({ slug, count: Number(count) || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const fallback = __tools.slice(0, 5).map((t) => ({ slug: t.id, count: 0 }));
    const list = ranked.length ? ranked : fallback;

    root.innerHTML = "";
    for (const item of list) {
      const t = toolById(item.slug);
      if (!t) continue;
      const href = `./tools/${t.id}/index.html`;
      const a = buildCard(t, { href });
      a.classList.add("popular-card");
      // Replace tags with a single “Category • count” tag when count exists (keeps UI compact).
      if (item.count) {
        const meta = a.querySelector(".card-meta");
        if (meta) meta.innerHTML = `<span class="tag">${escapeHtml(t.category || "")} • ${item.count}</span>${t.premium ? '<span class="tag">Premium</span>' : ""}`;
      }
      root.appendChild(a);
    }
  }

  function renderRecentTools() {
    const root = document.getElementById("recent-tools");
    if (!root) return;
    const stats = window.ToolboxTracking?.getStats?.() || { toolActions: {} };
    const actions = Object.entries(stats.toolActions || {})
      .map(([key, count]) => {
        const id = String(key).split(":")[0];
        return { id, count: Number(count) || 0 };
      })
      .filter((x) => x.id && x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    root.innerHTML = "";
    if (!actions.length) {
      root.innerHTML = '<div class="muted">No recent activity yet. Open a few tools to build your workspace history.</div>';
      return;
    }
    for (const item of actions) {
      const t = toolById(item.id);
      if (!t) continue;
      const a = document.createElement("a");
      a.className = "smart-suggestion";
      a.href = `./tools/${t.id}/index.html`;
      a.innerHTML = `<div class="meta"><strong>${escapeHtml(t.name)}</strong><span class="muted">${escapeHtml(
        t.category || ""
      )} • ${item.count} actions</span></div><span class="btn btn-small">Open</span>`;
      root.appendChild(a);
    }
  }

  function renderMainCategorySections() {
    const sections = [
      { sectionId: "ai-tools", gridId: "ai-tool-grid", category: "AI Tools" },
      { sectionId: "seo-tools", gridId: "seo-tool-grid", category: "SEO Tools" },
      { sectionId: "utility-tools", gridId: "utility-tool-grid", category: "Utility Tools" },
      { sectionId: "education-tools", gridId: "education-tool-grid", category: "Education Tools" },
      { sectionId: "health-tools", gridId: "health-tool-grid", category: "Health Tools" },
      { sectionId: "finance-tools", gridId: "finance-tool-grid", category: "Finance Tools" },
    ];
    for (const cfg of sections) {
      const root = document.getElementById(cfg.gridId);
      const section = document.getElementById(cfg.sectionId);
      if (!root || !section) continue;
      const list = __tools.filter((t) => String(t.category || "") === cfg.category);
      if (!list.length) {
        section.style.display = "none";
        continue;
      }
      section.style.display = "";
      root.innerHTML = "";
      for (const t of list) {
        root.appendChild(buildCard(t, { pathIsRelativeToCurrent: true }));
      }
    }
  }

  function initCommandPalette() {
    const palette = document.getElementById("command-palette");
    const input = document.getElementById("command-input");
    const results = document.getElementById("command-results");
    const closeBtn = document.getElementById("command-close");
    const openA = document.getElementById("open-command-palette");
    const openB = document.getElementById("open-command-palette-inline");
    if (!palette || !input || !results) return;

    let active = -1;
    let filtered = [];

    const getHref = (tool) => {
      const slug = toolSlugFromPath(window.location.pathname);
      return slug ? `../${tool.id}/index.html` : `./tools/${tool.id}/index.html`;
    };

    const render = () => {
      const q = normalize(input.value);
      filtered = __tools
        .filter((t) => normalize(`${t.name} ${t.description} ${t.category}`).includes(q))
        .slice(0, 12);
      if (!filtered.length) {
        results.innerHTML = '<div class="muted" style="padding:10px">No matching tools found.</div>';
        active = -1;
        return;
      }
      if (active >= filtered.length) active = filtered.length - 1;
      results.innerHTML = filtered
        .map(
          (t, i) =>
            `<button type="button" class="command-item ${i === active ? "is-active" : ""}" data-idx="${i}"><strong>${escapeHtml(
              t.name
            )}</strong><small>${escapeHtml(t.category || "")} • ${escapeHtml(t.description || "")}</small></button>`
        )
        .join("");
    };

    const open = () => {
      palette.hidden = false;
      render();
      window.setTimeout(() => input.focus(), 0);
    };
    const close = () => {
      palette.hidden = true;
      active = -1;
    };
    const goActive = () => {
      if (active < 0 || active >= filtered.length) return;
      const t = filtered[active];
      if (!t) return;
      window.location.href = getHref(t);
    };

    openA?.addEventListener("click", open);
    openB?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    palette.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.getAttribute("data-close-palette") === "1") close();
      const idx = Number(target.getAttribute("data-idx"));
      if (Number.isFinite(idx) && idx >= 0 && idx < filtered.length) {
        active = idx;
        goActive();
      }
    });
    input.addEventListener("input", () => {
      active = 0;
      render();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(filtered.length - 1, active + 1);
        render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(0, active - 1);
        render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        goActive();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    window.addEventListener("keydown", (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k";
      if (!isCmdK) return;
      e.preventDefault();
      if (palette.hidden) open();
      else close();
    });
  }

  function initMultiPanelRunner() {
    const select = document.getElementById("runner-tool-select");
    const addBtn = document.getElementById("runner-add");
    const clearBtn = document.getElementById("runner-clear");
    const panels = document.getElementById("runner-panels");
    if (!select || !addBtn || !clearBtn || !panels) return;

    select.innerHTML = '<option value="">Select a tool...</option>';
    __tools.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.category})`;
      select.appendChild(opt);
    });

    const renderEmpty = () => {
      if (panels.children.length) return;
      panels.innerHTML = '<div class="muted">No panels yet. Select a tool and click "Add Panel".</div>';
    };

    const removePanel = (id) => {
      const el = panels.querySelector(`[data-panel-id="${id}"]`);
      if (el) el.remove();
      renderEmpty();
    };

    const addPanelById = (toolId) => {
      const id = String(toolId || "");
      if (!id) return;
      if (panels.querySelector(`[data-panel-id="${id}"]`)) return;
      const active = panels.querySelectorAll(".runner-panel").length;
      if (active >= 3) return;
      const tool = toolById(id);
      if (!tool) return;
      if (panels.textContent.includes("No panels yet")) panels.innerHTML = "";

      const card = document.createElement("div");
      card.className = "runner-panel";
      card.setAttribute("data-panel-id", id);
      card.innerHTML = `
        <div class="runner-head">
          <strong>${escapeHtml(tool.name)}</strong>
          <button type="button" class="btn btn-small" data-runner-remove="${escapeHtml(id)}">Remove</button>
        </div>
        <iframe class="runner-frame" loading="lazy" src="./tools/${escapeHtml(id)}/index.html" title="${escapeHtml(tool.name)}"></iframe>
      `;
      panels.appendChild(card);
    };

    addBtn.addEventListener("click", () => {
      addPanelById(String(select.value || ""));
    });

    clearBtn.addEventListener("click", () => {
      panels.innerHTML = "";
      renderEmpty();
    });

    panels.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.getAttribute("data-runner-remove");
      if (!id) return;
      removePanel(id);
    });

    window.addEventListener("toolbox:runner:preset", (event) => {
      const picks = Array.isArray(event?.detail?.tools) ? event.detail.tools : [];
      panels.innerHTML = "";
      for (const id of picks.slice(0, 3)) {
        addPanelById(String(id));
      }
      renderEmpty();
    });

    renderEmpty();
  }

  function initFloatingDock() {
    const recentRoot = document.getElementById("dock-recent");
    const aiPreset = document.getElementById("dock-preset-ai");
    const seoPreset = document.getElementById("dock-preset-seo");
    if (!recentRoot) return;

    const renderDockRecent = () => {
      const stats = window.ToolboxTracking?.getStats?.() || { toolRuns: {} };
      const ranked = Object.entries(stats.toolRuns || {})
        .map(([id, count]) => ({ id, count: Number(count) || 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      if (!ranked.length) {
        recentRoot.innerHTML = '<span class="muted">No recent runs yet.</span>';
        return;
      }
      recentRoot.innerHTML = ranked
        .map((r) => {
          const t = toolById(r.id);
          if (!t) return "";
          return `<a class="workspace-chip" href="./tools/${escapeHtml(t.id)}/index.html">${escapeHtml(t.name)}</a>`;
        })
        .join("");
    };

    aiPreset?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("toolbox:runner:preset", { detail: { tools: ["prompt-generator", "prompt-optimizer", "token-counter"] } }));
      document.getElementById("tool-runner")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    seoPreset?.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("toolbox:runner:preset", { detail: { tools: ["serp-preview", "keyword-density-checker", "plagiarism-checker"] } })
      );
      document.getElementById("tool-runner")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    renderDockRecent();
    window.addEventListener("toolbox:analytics", (e) => {
      if (e?.detail?.type === "tool_run") renderDockRecent();
    });
  }

  function detectInputType(raw) {
    const text = String(raw || "").trim();
    if (!text) return { type: "empty", confidence: 0, reason: "No input." };
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(text)) return { type: "jwt", confidence: 96, reason: "Looks like JWT token format." };
    if ((text.startsWith("{") || text.startsWith("[")) && (text.endsWith("}") || text.endsWith("]"))) {
      try {
        JSON.parse(text);
        return { type: "json", confidence: 94, reason: "Valid JSON structure detected." };
      } catch {
        return { type: "json-broken", confidence: 72, reason: "JSON-like structure but invalid syntax." };
      }
    }
    if (/^https?:\/\//i.test(text) || /%[0-9a-f]{2}/i.test(text)) return { type: "url", confidence: 84, reason: "URL/encoded URL pattern found." };
    if (/^\s*(select|insert|update|delete|with)\b/i.test(text)) return { type: "sql", confidence: 88, reason: "SQL keywords detected." };
    if (/<[a-z][\s\S]*>/i.test(text)) return { type: "html", confidence: 82, reason: "HTML-like tags detected." };
    if (text.includes(",") && text.split(/\r?\n/).length > 1) return { type: "csv", confidence: 76, reason: "CSV-like tabular pattern detected." };
    if (/\b(error|warn|trace|exception)\b/i.test(text) && text.split(/\r?\n/).length > 1) return { type: "logs", confidence: 73, reason: "Log-like content detected." };
    return { type: "text", confidence: 58, reason: "Generic text; no strong signature matched." };
  }

  function recommendedToolIds(type) {
    switch (type) {
      case "json":
      case "json-broken":
        return ["json-formatter", "json-schema-generator", "diff-checker"];
      case "jwt":
        return ["jwt-decoder", "jwt-builder", "base64url-encoder"];
      case "url":
        return ["url-encoder-decoder", "base64-encoder", "html-entity-encoder"];
      case "sql":
        return ["sql-formatter", "regex-tester", "timestamp-converter"];
      case "html":
        return ["html-minifier", "html-entity-encoder", "text-case-converter"];
      case "csv":
        return ["csv-json-converter", "diff-checker", "json-formatter"];
      case "logs":
        return ["log-beautifier", "regex-tester", "json-formatter"];
      default:
        return ["text-case-converter", "regex-tester", "base64-encoder"];
    }
  }

  function loadCapsules() {
    try {
      const raw = localStorage.getItem(CAPSULES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function saveCapsules(list) {
    try {
      localStorage.setItem(CAPSULES_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  function detectSchemaDrift(raw) {
    const parts = String(raw || "").split(/\n---\n/);
    if (parts.length < 2) throw new Error("Use separator line '---' between old and new JSON.");
    const oldObj = JSON.parse(parts[0].trim());
    const newObj = JSON.parse(parts.slice(1).join("\n---\n").trim());

    const keys = (obj, p = "") => {
      const out = [];
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj)) {
          const key = p ? `${p}.${k}` : k;
          out.push(key);
          out.push(...keys(v, key));
        }
      }
      return out;
    };
    const a = new Set(keys(oldObj));
    const b = new Set(keys(newObj));
    const added = [...b].filter((k) => !a.has(k)).sort();
    const removed = [...a].filter((k) => !b.has(k)).sort();

    const typeChanges = [];
    const all = [...new Set([...a, ...b])];
    const get = (obj, path) =>
      path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);
    for (const path of all) {
      const v1 = get(oldObj, path);
      const v2 = get(newObj, path);
      if (v1 === undefined || v2 === undefined) continue;
      const t1 = Array.isArray(v1) ? "array" : typeof v1;
      const t2 = Array.isArray(v2) ? "array" : typeof v2;
      if (t1 !== t2) typeChanges.push(`${path}: ${t1} -> ${t2}`);
    }
    return [
      `Added keys (${added.length}):`,
      ...(added.length ? added : ["None"]),
      "",
      `Removed keys (${removed.length}):`,
      ...(removed.length ? removed : ["None"]),
      "",
      `Type changes (${typeChanges.length}):`,
      ...(typeChanges.length ? typeChanges : ["None"]),
    ].join("\n");
  }

  function base64UrlDecode(text) {
    const base = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base.length % 4)) % 4);
    const bin = atob(base + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function auditJwt(token) {
    const parts = String(token || "").trim().split(".");
    if (parts.length < 2) throw new Error("Invalid JWT format.");
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const findings = [];
    const now = Math.floor(Date.now() / 1000);

    if ((header.alg || "").toLowerCase() === "none") findings.push("High risk: alg=none.");
    if (!payload.exp) findings.push("Warning: exp claim missing.");
    if (payload.exp && Number(payload.exp) < now) findings.push("Expired token.");
    if (payload.nbf && Number(payload.nbf) > now) findings.push("Token not active yet (nbf in future).");
    if (!payload.iat) findings.push("iat claim missing.");
    if (!payload.iss) findings.push("iss claim missing.");
    if (!payload.aud) findings.push("aud claim missing.");
    if (String(token || "").length > 2048) findings.push("Large token size may impact headers.");
    if (!findings.length) findings.push("No obvious high-risk issues found.");

    const score = Math.max(5, 100 - findings.filter((f) => /high risk|expired/i.test(f)).length * 30 - findings.length * 5);
    return `Risk score: ${score}/100\n\nHeader:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nFindings:\n- ${findings.join("\n- ")}`;
  }

  function initSmartAnalyze() {
    const input = document.getElementById("smart-input");
    const run = document.getElementById("smart-run");
    const clear = document.getElementById("smart-clear");
    const result = document.getElementById("smart-result");
    const sugg = document.getElementById("smart-suggestions");
    const capsuleList = document.getElementById("capsule-list");
    const capsuleSave = document.getElementById("capsule-save");
    const capsuleExport = document.getElementById("capsule-export");
    const capsuleImport = document.getElementById("capsule-import");
    const capsuleFile = document.getElementById("capsule-file");
    const driftInput = document.getElementById("drift-input");
    const driftRun = document.getElementById("drift-run");
    const driftOutput = document.getElementById("drift-output");
    const jwtIn = document.getElementById("jwt-audit-input");
    const jwtRun = document.getElementById("jwt-audit-run");
    const jwtOut = document.getElementById("jwt-audit-output");
    if (!input || !run || !clear || !result || !sugg) return;

    const presets = Array.from(document.querySelectorAll(".smart-preset"));

    const renderSuggestions = (ids) => {
      sugg.innerHTML = "";
      for (const id of ids) {
        const tool = toolById(id);
        if (!tool) continue;
        const row = document.createElement("div");
        row.className = "smart-suggestion";
        const href = new URL(tool.path, SITE_ROOT_URL).toString();
        row.innerHTML = `
          <div class="meta">
            <strong>${escapeHtml(tool.name || "")}</strong>
            <span class="muted">${escapeHtml(tool.description || "")}</span>
          </div>
        `;
        const btn = document.createElement("a");
        btn.className = "btn btn-small";
        btn.href = href;
        btn.textContent = "Open";
        row.appendChild(btn);
        sugg.appendChild(row);
      }
      if (!sugg.children.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No suggestions available yet.";
        sugg.appendChild(empty);
      }
    };

    const analyze = () => {
      const det = detectInputType(input.value);
      result.textContent = `Detected: ${det.type.toUpperCase()} (${det.confidence}% confidence) — ${det.reason}`;
      renderSuggestions(recommendedToolIds(det.type));
      window.ToolboxTracking?.trackRun("smart-analyze", "analyze");
      return det;
    };

    const renderCapsules = () => {
      if (!capsuleList) return;
      const list = loadCapsules();
      capsuleList.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No saved capsules yet.";
        capsuleList.appendChild(empty);
        return;
      }
      for (const c of list.slice(0, 8)) {
        const box = document.createElement("div");
        box.className = "capsule-item";
        const dt = new Date(c.ts || Date.now()).toLocaleString();
        box.innerHTML = `<div class="rowline"><strong>${escapeHtml((c.type || "unknown").toUpperCase())}</strong><span class="muted">${escapeHtml(dt)}</span></div><div class="muted">${escapeHtml(c.reason || "")}</div>`;
        capsuleList.appendChild(box);
      }
    };

    run.addEventListener("click", analyze);
    for (const preset of presets) {
      preset.addEventListener("click", () => {
        const seed = preset.getAttribute("data-seed") || "";
        input.value = seed;
        analyze();
      });
    }
    clear.addEventListener("click", () => {
      input.value = "";
      result.textContent = "Detection result will appear here.";
      sugg.innerHTML = "";
    });

    if (capsuleSave) {
      capsuleSave.addEventListener("click", () => {
        const text = String(input.value || "").trim();
        if (!text) return;
        const det = analyze();
        const all = loadCapsules();
        all.unshift({
          ts: Date.now(),
          type: det.type,
          reason: det.reason,
          inputPreview: text.slice(0, 300),
        });
        saveCapsules(all.slice(0, 50));
        renderCapsules();
      });
    }
    if (capsuleExport) {
      capsuleExport.addEventListener("click", () => {
        const data = JSON.stringify(loadCapsules(), null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "toolbox-capsules.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }
    if (capsuleImport && capsuleFile) {
      capsuleImport.addEventListener("click", () => capsuleFile.click());
      capsuleFile.addEventListener("change", async () => {
        const file = capsuleFile.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const arr = JSON.parse(text);
          if (!Array.isArray(arr)) throw new Error("Invalid file.");
          saveCapsules(arr.slice(0, 50));
          renderCapsules();
        } catch {
          // ignore
        } finally {
          capsuleFile.value = "";
        }
      });
    }

    if (driftInput && driftRun && driftOutput) {
      driftRun.addEventListener("click", () => {
        try {
          driftOutput.textContent = detectSchemaDrift(driftInput.value);
        } catch (e) {
          driftOutput.textContent = e instanceof Error ? e.message : "Failed to detect drift.";
        }
      });
    }

    if (jwtIn && jwtRun && jwtOut) {
      jwtRun.addEventListener("click", () => {
        try {
          jwtOut.textContent = auditJwt(jwtIn.value);
        } catch (e) {
          jwtOut.textContent = e instanceof Error ? e.message : "Failed to audit JWT.";
        }
      });
    }

    renderCapsules();
  }

  function initLocalAiBadge() {
    const badge = document.getElementById("local-ai-badge");
    if (!badge) return;
    try {
      const raw = localStorage.getItem("toolbox_ai_settings_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      const enabled = Boolean(parsed?.enabled);
      badge.textContent = enabled ? "Enabled (local)" : "Off (cloud-free)";
      badge.classList.remove("ok", "off");
      badge.classList.add(enabled ? "ok" : "off");
    } catch {
      badge.textContent = "Off (cloud-free)";
      badge.classList.remove("ok");
      badge.classList.add("off");
    }
  }

  async function initRegistry() {
    const meta = document.getElementById("tools-meta");
    try {
      const [registry, flags] = await Promise.all([fetchJson(REGISTRY_URL), fetchJson(FLAGS_URL).catch(() => null)]);
      const toolsRaw = Array.isArray(registry?.tools) ? registry.tools : [];
      __tools = applyToolFlags(toolsRaw, flags || {});

      // Homepage: cards + categories + filters.
      renderHomepageTools();
      ensureCategoryOptions();
      renderCategoryChips();
      wireHomepageFilters();

      // Tool pages: related section.
      renderRelatedTools();

      // Homepage: popular tools.
      renderPopularTools();
      renderRecentTools();
      renderMainCategorySections();
      initLocalAiBadge();
      initCommandPalette();
      if (meta && !document.getElementById("tool-search")) {
        meta.textContent = `${__tools.length} tools`;
      }
    } catch (e) {
      if (meta) meta.textContent = "Unable to load tools";
      try {
        console.error("[Toolbox] Registry init failed:", e);
      } catch {
        // ignore
      }
    }
  }

  initRegistry();

  (function initPricingPage() {
    const freeBtn = document.getElementById("plan-free");
    const proBtn = document.getElementById("plan-pro");
    const teamBtn = document.getElementById("plan-team");
    const status = document.getElementById("pricing-status");
    if (!freeBtn || !proBtn || !teamBtn || !status) return;

    const showStatus = (msg) => {
      status.style.display = msg ? "" : "none";
      status.textContent = msg;
    };
    const apply = (plan) => {
      const p = setPlan(plan);
      ensurePlanBadge();
      showStatus(`Plan updated: ${p.toUpperCase()}. ${p === "free" ? "Ads remain enabled." : "Ads are hidden for this demo plan."}`);
    };
    freeBtn.addEventListener("click", () => apply("free"));
    proBtn.addEventListener("click", () => apply("pro"));
    teamBtn.addEventListener("click", () => apply("team"));
  })();

  (function initDensityToggle() {
    const btn = document.getElementById("density-toggle");
    const apply = (d) => {
      const v = d === "compact" ? "compact" : "comfortable";
      document.documentElement.dataset.density = v;
      try {
        localStorage.setItem(DENSITY_KEY, v);
      } catch {
        // ignore
      }
      if (btn) btn.textContent = v === "compact" ? "Comfortable view" : "Compact view";
    };
    try {
      apply(localStorage.getItem(DENSITY_KEY) || "comfortable");
    } catch {
      apply("comfortable");
    }
    if (btn) {
      btn.addEventListener("click", () => {
        const current = document.documentElement.dataset.density || "comfortable";
        apply(current === "compact" ? "comfortable" : "compact");
      });
    }
  })();

  (function initGlobalShortcuts() {
    window.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;
      if (event.key === "/") {
        const search = document.getElementById("tool-search");
        if (!search) return;
        event.preventDefault();
        search.focus();
        search.select?.();
      }
    });
  })();

  (function initThemePresets() {
    const buttons = Array.from(document.querySelectorAll("[data-theme-preset]"));
    if (!buttons.length) return;
    const apply = (preset) => {
      const p = ["vibrant", "minimal", "neon"].includes(preset) ? preset : "minimal";
      document.documentElement.setAttribute("data-preset", p);
      try {
        localStorage.setItem(THEME_PRESET_KEY, p);
      } catch {
        // ignore
      }
      buttons.forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-theme-preset") === p));
    };
    let saved = "vibrant";
    try {
      saved = localStorage.getItem(THEME_PRESET_KEY) || "minimal";
    } catch {
      // ignore
    }
    apply(saved);
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        apply(String(b.getAttribute("data-theme-preset") || "vibrant"));
      })
    );
  })();

  (function initScrollReveal() {
    const targets = Array.from(document.querySelectorAll(".section, .card, .panel"));
    if (!targets.length) return;
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));
  })();

  (function initFunMode() {
    const btn = document.getElementById("fun-mode-toggle");
    const particlesRoot = document.getElementById("fun-particles");
    if (!btn) return;

    let timer = null;

    const spawnParticle = () => {
      if (!particlesRoot) return;
      const p = document.createElement("span");
      p.className = "fun-particle";
      const left = Math.random() * 100;
      const size = 4 + Math.random() * 6;
      const hue = Math.random() > 0.5 ? "255,122,162" : "126,123,255";
      p.style.left = `${left}%`;
      p.style.bottom = `${-10 + Math.random() * 20}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = `rgba(${hue}, .85)`;
      p.style.animation = `funFloatParticle ${2.2 + Math.random() * 2.1}s linear`;
      particlesRoot.appendChild(p);
      window.setTimeout(() => p.remove(), 4600);
    };

    const setFun = (on) => {
      const value = on ? "on" : "off";
      document.documentElement.setAttribute("data-fun-mode", value);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
      btn.textContent = on ? "Fun Mode On" : "Fun Mode";
      try {
        localStorage.setItem(FUN_MODE_KEY, value);
      } catch {
        // ignore
      }
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      if (on) {
        timer = window.setInterval(() => {
          spawnParticle();
          if (Math.random() > 0.6) spawnParticle();
        }, 550);
      } else if (particlesRoot) {
        particlesRoot.innerHTML = "";
      }
    };

    let saved = "off";
    try {
      saved = localStorage.getItem(FUN_MODE_KEY) || "off";
    } catch {
      // ignore
    }
    setFun(saved === "on");
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-fun-mode") === "on";
      setFun(!current);
    });
  })();

  (function initGlobalOllamaAgent() {
    const mount = document.body;
    if (!mount || document.getElementById("site-ai-agent")) return;

    const launcher = document.createElement("button");
    launcher.id = "site-ai-agent";
    launcher.type = "button";
    launcher.className = "agent-launcher";
    launcher.innerHTML = '<span class="agent-launcher-dot" aria-hidden="true"></span><span class="agent-launcher-label">AI</span>';
    launcher.setAttribute("aria-label", "Open AI agent");

    const backdrop = document.createElement("div");
    backdrop.id = "agent-backdrop";
    backdrop.className = "agent-backdrop";
    backdrop.hidden = true;

    const panel = document.createElement("section");
    panel.className = "agent-panel";
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="agent-head">
        <strong>Ollama Agent</strong>
        <button type="button" class="btn btn-small" id="agent-close">Close</button>
      </div>
      <div id="agent-log" class="agent-log">
        <div class="agent-msg">Hi! I can help with any page on this site. Ask me to explain this tool, improve text, or suggest next actions.</div>
      </div>
      <div class="agent-compose">
        <div class="actions">
          <select id="agent-model" class="input" style="max-width:220px"><option value="">Default model</option></select>
          <select id="agent-profile" class="input" style="max-width:170px">
            <option value="general">General</option>
            <option value="student">Student</option>
            <option value="marketing">Marketing</option>
            <option value="founder">Founder</option>
            <option value="developer">Developer</option>
          </select>
          <button type="button" class="btn btn-small" id="agent-refresh-models">Refresh models</button>
          <label class="muted" style="display:flex;align-items:center;gap:6px"><input id="agent-memory" type="checkbox" checked/> Memory</label>
          <label class="muted" style="display:flex;align-items:center;gap:6px"><input id="agent-json-mode" type="checkbox"/> JSON actions</label>
          <label class="muted" style="display:flex;align-items:center;gap:6px"><input id="agent-all-tools" type="checkbox" checked/> All tools access</label>
        </div>
        <div class="agent-quick">
          <button type="button" class="btn btn-small" data-agent-quick="Explain this page and how to use it">Explain this page</button>
          <button type="button" class="btn btn-small" data-agent-quick="Suggest best next 3 tools for this task">Best next tools</button>
          <button type="button" class="btn btn-small" data-agent-quick="Improve my text in current input">Improve input text</button>
        </div>
        <textarea id="agent-input" placeholder="Ask anything for this website/tool..."></textarea>
        <div class="actions">
          <button type="button" class="btn btn-small btn-primary" id="agent-send">Run with Ollama</button>
          <button type="button" class="btn btn-small" id="agent-voice">Voice</button>
          <button type="button" class="btn btn-small btn-danger" id="agent-stop" style="display:none">Stop</button>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-small" id="agent-apply-input">Use in input</button>
          <button type="button" class="btn btn-small" id="agent-copy-last">Copy answer</button>
        </div>
        <div class="agent-advanced">
          <div class="actions">
            <button type="button" class="btn btn-small" id="agent-autofill">Auto-fill fields</button>
            <button type="button" class="btn btn-small" id="agent-autorun">Auto-run tool</button>
            <button type="button" class="btn btn-small btn-primary" id="agent-autopilot">Autopilot</button>
            <button type="button" class="btn btn-small" id="agent-exec-json">Execute JSON actions</button>
            <button type="button" class="btn btn-small" id="agent-plan">Build workflow plan</button>
            <button type="button" class="btn btn-small" id="agent-score">Score output</button>
          </div>
          <div id="agent-plan-output" class="agent-plan" style="display:none"></div>
          <div id="agent-score-output" class="agent-score-grid" style="display:none"></div>
        </div>
        <div id="agent-tools" class="agent-quick"></div>
      </div>
    `;

    mount.appendChild(backdrop);
    mount.appendChild(panel);
    mount.appendChild(launcher);

    const log = panel.querySelector("#agent-log");
    const input = panel.querySelector("#agent-input");
    const send = panel.querySelector("#agent-send");
    const stop = panel.querySelector("#agent-stop");
    const close = panel.querySelector("#agent-close");
    const voice = panel.querySelector("#agent-voice");
    const applyInputBtn = panel.querySelector("#agent-apply-input");
    const copyLastBtn = panel.querySelector("#agent-copy-last");
    const modelSelect = panel.querySelector("#agent-model");
    const profileSelect = panel.querySelector("#agent-profile");
    const refreshModels = panel.querySelector("#agent-refresh-models");
    const memoryToggle = panel.querySelector("#agent-memory");
    const jsonModeToggle = panel.querySelector("#agent-json-mode");
    const allToolsToggle = panel.querySelector("#agent-all-tools");
    const toolsRow = panel.querySelector("#agent-tools");
    const autoFillBtn = panel.querySelector("#agent-autofill");
    const autoRunBtn = panel.querySelector("#agent-autorun");
    const autopilotBtn = panel.querySelector("#agent-autopilot");
    const execJsonBtn = panel.querySelector("#agent-exec-json");
    const planBtn = panel.querySelector("#agent-plan");
    const scoreBtn = panel.querySelector("#agent-score");
    const planOut = panel.querySelector("#agent-plan-output");
    const scoreOut = panel.querySelector("#agent-score-output");
    let activeController = null;
    let lastAssistantText = "";

    const loadMemory = () => {
      try {
        const raw = localStorage.getItem(AGENT_MEMORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    };
    const saveMemory = (rows) => {
      try {
        localStorage.setItem(AGENT_MEMORY_KEY, JSON.stringify(rows.slice(-8)));
      } catch {
        // ignore
      }
    };
    const getProfile = () => {
      const v = String(profileSelect?.value || "general");
      return ["general", "student", "marketing", "founder", "developer"].includes(v) ? v : "general";
    };
    const profileSystemPrompt = (profile) => {
      if (profile === "student") return "You are a student success coach. Give simple steps, examples, and beginner-friendly language.";
      if (profile === "marketing") return "You are a marketing growth expert. Optimize for conversion, clarity, and actionable campaign steps.";
      if (profile === "founder") return "You are a startup founder copilot. Focus on speed, decision quality, and practical business outcomes.";
      if (profile === "developer") return "You are a senior engineering copilot. Give precise technical guidance and safe implementation steps.";
      return "You are a practical AI copilot for productivity tools.";
    };

    const appendMsg = (text, kind = "assistant") => {
      if (!log) return null;
      const row = document.createElement("div");
      row.className = `agent-msg ${kind === "user" ? "user" : ""}`;
      row.textContent = String(text || "");
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    };

    const pageContext = () => {
      const title = document.title || "Toolbox page";
      const h1 = (document.querySelector("h1")?.textContent || "").trim();
      const inputText =
        (document.querySelector("#input")?.value || "").toString().trim().slice(0, 1500) ||
        (document.querySelector("textarea")?.value || "").toString().trim().slice(0, 1500);
      return `Page title: ${title}\nMain heading: ${h1}\nPath: ${window.location.pathname}\nInput snapshot:\n${inputText || "(empty)"}`;
    };

    const parseAutoFill = (text) => {
      const out = [];
      const lines = String(text || "").split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
        if (!m) continue;
        out.push({ key: m[1].toLowerCase(), value: m[2].trim() });
      }
      return out;
    };

    const applyToBestField = (key, value) => {
      const map = {
        topic: "#topic",
        audience: "#audience",
        goal: "#goal",
        input: "#input",
        code: "#input",
        text: "#input",
        prompt: "#input",
      };
      const sel = map[key] || `#${key}`;
      const el = document.querySelector(sel);
      if (!el || !("value" in el)) return false;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    };

    const autoRunTool = () => {
      const candidates = ["#generate", "#optimize", "#run", "#format", "#calc", "#calculate", "#explain", "#encode"];
      for (const sel of candidates) {
        const btn = document.querySelector(sel);
        if (btn && typeof btn.click === "function") {
          btn.click();
          return sel;
        }
      }
      return "";
    };

    const extractJsonActions = (text) => {
      const raw = String(text || "").trim();
      if (!raw) return null;
      const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
      const candidate = fenced ? fenced[1].trim() : raw;
      try {
        const parsed = JSON.parse(candidate);
        const actions = Array.isArray(parsed?.actions) ? parsed.actions : Array.isArray(parsed) ? parsed : null;
        return actions;
      } catch {
        return null;
      }
    };

    const executeJsonActions = (actions) => {
      if (!Array.isArray(actions) || !actions.length) {
        appendMsg("No valid JSON actions found.");
        return;
      }
      let executed = 0;
      for (const a of actions.slice(0, 12)) {
        const type = String(a?.type || "").toLowerCase();
        const selector = String(a?.selector || "");
        if (type === "open_tool") {
          const toolId = String(a?.tool_id || a?.toolId || "").trim();
          if (!toolId) continue;
          const exists = Array.isArray(__tools) && __tools.some((t) => t.id === toolId);
          if (!exists) continue;
          window.location.href = `/tools/${toolId}/index.html`;
          executed += 1;
          break;
        }
        if (type === "wait_ms") {
          // UI-only runner: ignore wait in synchronous executor.
          executed += 1;
          continue;
        }
        if (type === "navigate") {
          const target = String(a?.url || "").trim();
          if (!target) continue;
          if (/^https?:\/\//i.test(target)) {
            const u = new URL(target, window.location.href);
            if (u.origin !== window.location.origin) continue;
            window.location.href = u.toString();
            executed += 1;
            break;
          } else {
            window.location.href = target.startsWith("/") ? target : `./${target}`;
            executed += 1;
            break;
          }
        }
        if (!selector) continue;
        const el = document.querySelector(selector);
        if (!el) continue;
        if (type === "fill" || type === "set_text") {
          const value = String(a?.value ?? a?.text ?? "");
          if ("value" in el) {
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            executed += 1;
          } else {
            el.textContent = value;
            executed += 1;
          }
        } else if (type === "select_option") {
          const value = String(a?.value ?? "");
          if (el instanceof HTMLSelectElement) {
            el.value = value;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            executed += 1;
          }
        } else if (type === "click") {
          if (typeof el.click === "function") {
            el.click();
            executed += 1;
          }
        }
      }
      appendMsg(executed ? `Executed ${executed} JSON action(s).` : "JSON actions could not be executed.");
    };

    const scoreText = (text) => {
      const t = String(text || "").trim();
      if (!t) return null;
      const words = t.split(/\s+/).filter(Boolean);
      const sentences = t.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
      const avgSentence = sentences.length ? words.length / sentences.length : words.length;
      const actionHits = (t.match(/\b(create|build|use|click|write|optimize|improve|plan|run|check)\b/gi) || []).length;
      const clarity = Math.max(40, Math.min(100, Math.round(100 - Math.abs(avgSentence - 16) * 2)));
      const actionability = Math.max(35, Math.min(100, 40 + actionHits * 6));
      const structure = /(\n- |\n\d+\)|\n\d+\.)/.test(t) ? 90 : 62;
      const brevity = words.length <= 220 ? 88 : Math.max(45, 88 - Math.round((words.length - 220) / 8));
      return { clarity, actionability, structure, brevity };
    };

    const suggestTools = (text) => {
      if (!toolsRow) return;
      const q = String(text || "").toLowerCase();
      const source = Array.isArray(__tools) ? __tools : [];
      const picks = source
        .filter((t) => q.includes(String(t.name || "").toLowerCase()) || q.includes(String(t.id || "").toLowerCase()))
        .slice(0, 3);
      if (!picks.length) {
        toolsRow.innerHTML = "";
        return;
      }
      toolsRow.innerHTML = picks
        .map((t) => `<a class="btn btn-small" href="./tools/${escapeHtml(t.id)}/index.html">Open ${escapeHtml(t.name)}</a>`)
        .join("");
    };

    const setOpen = (open) => {
      const on = Boolean(open);
      panel.classList.toggle("is-open", on);
      panel.setAttribute("aria-hidden", on ? "false" : "true");
      launcher.setAttribute("aria-expanded", on ? "true" : "false");
      backdrop.hidden = !on;
      if (on) input?.focus();
    };
    launcher.addEventListener("click", () => setOpen(panel.getAttribute("aria-hidden") === "true"));
    close?.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    panel.querySelectorAll("[data-agent-quick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const txt = String(btn.getAttribute("data-agent-quick") || "").trim();
        if (input) input.value = txt;
      });
    });

    const initModelPicker = async () => {
      let ai;
      try {
        ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
      } catch {
        return;
      }
      const settings = ai?.getLocalAISettings?.();
      if (!modelSelect) return;
      modelSelect.innerHTML = `<option value="">${escapeHtml(settings?.model || "Default model")}</option>`;
      refreshModels?.addEventListener("click", async () => {
        try {
          const list = await ai.listLocalModels();
          modelSelect.innerHTML = "";
          if (!list.length) {
            modelSelect.innerHTML = `<option value="">${escapeHtml(settings?.model || "Default model")}</option>`;
            return;
          }
          list.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            if (m === settings?.model) opt.selected = true;
            modelSelect.appendChild(opt);
          });
        } catch {
          // ignore
        }
      });
    };
    initModelPicker();
    try {
      const savedProfile = localStorage.getItem(AGENT_PROFILE_KEY) || "general";
      if (profileSelect) profileSelect.value = savedProfile;
    } catch {
      // ignore
    }
    profileSelect?.addEventListener("change", () => {
      try {
        localStorage.setItem(AGENT_PROFILE_KEY, getProfile());
      } catch {
        // ignore
      }
    });

    const runAgent = async () => {
      const question = String(input?.value || "").trim();
      if (!question) return;
      appendMsg(question, "user");
      if (input) input.value = "";

      let ai;
      try {
        ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
      } catch {
        appendMsg("AI provider failed to load.");
        return;
      }
      const settings = ai?.getLocalAISettings?.();
      if (!settings?.enabled) {
        appendMsg("Local AI is disabled. Open any tool and enable Local AI (Ollama) first.");
        return;
      }

      const assistantRow = appendMsg("Thinking with local Ollama...");
      activeController = new AbortController();
      send.style.display = "none";
      stop.style.display = "";
      try {
        const memoryEnabled = Boolean(memoryToggle?.checked);
        const memoryRows = memoryEnabled ? loadMemory() : [];
        const memoryText = memoryRows.length
          ? `Recent conversation:\n${memoryRows.map((r) => `${r.role}: ${r.text}`).join("\n")}\n\n`
          : "";
        const selectedModel = String(modelSelect?.value || "").trim();
        const jsonMode = Boolean(jsonModeToggle?.checked);
        const allTools = Boolean(allToolsToggle?.checked);
        const toolList = allTools && Array.isArray(__tools) && __tools.length
          ? __tools.map((t) => `${t.id}: ${t.name}`).join("\n")
          : "";
        const profile = getProfile();
        await ai.runLocalAIStream({
          systemPrompt:
            jsonMode
              ? `You are a website automation agent for Toolbox. Output ONLY strict JSON object: {"actions":[{"type":"fill|set_text|click|navigate|open_tool|select_option|wait_ms","selector":"#id or .class (if needed)","value":"text/value","url":"path or same-origin url (for navigate)","tool_id":"tool id for open_tool","ms":500}],"note":"short summary"}. Do not include markdown.${toolList ? `\nAvailable tools:\n${toolList}` : ""}`
              : `You are the website AI agent for Toolbox. ${profileSystemPrompt(profile)} Give concise, practical help and suggest specific tools/routes in this website.`,
          userPrompt: `${pageContext()}\n\n${memoryText}User request:\n${question}`,
          signal: activeController.signal,
          ...(selectedModel ? { model: selectedModel } : {}),
          onToken: (_chunk, full) => {
            lastAssistantText = full;
            if (assistantRow) assistantRow.textContent = full;
          },
        });
        if (memoryEnabled) {
          const merged = [...loadMemory(), { role: "user", text: question }, { role: "assistant", text: lastAssistantText || "" }];
          saveMemory(merged);
        }
        suggestTools(lastAssistantText);
      } catch (e) {
        const aborted = e && (e.name === "AbortError" || /aborted/i.test(String(e.message || "")));
        if (assistantRow) assistantRow.textContent = aborted ? "Agent stopped." : `Agent error: ${e?.message || "Failed"}`;
      } finally {
        activeController = null;
        send.style.display = "";
        stop.style.display = "none";
      }
    };

    send?.addEventListener("click", runAgent);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        runAgent();
      }
    });
    stop?.addEventListener("click", () => {
      if (activeController) activeController.abort();
    });

    applyInputBtn?.addEventListener("click", () => {
      const txt = String(lastAssistantText || "").trim();
      if (!txt) return;
      const target = document.querySelector("#input, textarea");
      if (target && "value" in target) {
        target.value = txt;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    copyLastBtn?.addEventListener("click", async () => {
      const txt = String(lastAssistantText || "").trim();
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
      } catch {
        // ignore
      }
    });

    autoFillBtn?.addEventListener("click", () => {
      const txt = String(lastAssistantText || "").trim();
      if (!txt) {
        appendMsg("No assistant output available for auto-fill.");
        return;
      }
      const pairs = parseAutoFill(txt);
      let count = 0;
      for (const p of pairs) {
        if (applyToBestField(p.key, p.value)) count += 1;
      }
      if (!count && txt) {
        const el = document.querySelector("#input, textarea");
        if (el && "value" in el) {
          el.value = txt;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          count = 1;
        }
      }
      appendMsg(count ? `Auto-fill applied to ${count} field(s).` : "Auto-fill could not match fields.");
    });

    autoRunBtn?.addEventListener("click", () => {
      const hit = autoRunTool();
      appendMsg(hit ? `Auto-run clicked ${hit}.` : "No runnable action found on this page.");
    });

    execJsonBtn?.addEventListener("click", () => {
      const actions = extractJsonActions(lastAssistantText);
      executeJsonActions(actions);
    });

    planBtn?.addEventListener("click", () => {
      const path = window.location.pathname;
      const plans = [];
      if (/prompt-generator/.test(path)) {
        plans.push("1) Fill topic, audience, goal", "2) Click Generate", "3) Send output to Prompt Optimizer", "4) Validate token usage");
      } else if (/prompt-optimizer/.test(path)) {
        plans.push("1) Paste prompt", "2) Click Optimize", "3) Check clarity + constraints", "4) Copy final prompt");
      } else if (/token-counter/.test(path)) {
        plans.push("1) Paste content", "2) Review tokens", "3) Reduce length if needed");
      } else if (/code-explainer/.test(path)) {
        plans.push("1) Paste code", "2) Click Explain", "3) Copy summary", "4) Refine with follow-up ask");
      } else {
        plans.push("1) Choose a tool category", "2) Open relevant tool", "3) Use AI Agent quick prompts", "4) Apply output and run tool");
      }
      if (planOut) {
        planOut.style.display = "";
        planOut.textContent = plans.join("\n");
      }
    });

    scoreBtn?.addEventListener("click", () => {
      const s = scoreText(lastAssistantText);
      if (!s || !scoreOut) {
        appendMsg("No assistant output available to score.");
        return;
      }
      scoreOut.style.display = "grid";
      scoreOut.innerHTML = `
        <div class="agent-score"><div class="k">Clarity</div><div class="v">${s.clarity}/100</div></div>
        <div class="agent-score"><div class="k">Actionability</div><div class="v">${s.actionability}/100</div></div>
        <div class="agent-score"><div class="k">Structure</div><div class="v">${s.structure}/100</div></div>
        <div class="agent-score"><div class="k">Brevity</div><div class="v">${s.brevity}/100</div></div>
      `;
    });

    autopilotBtn?.addEventListener("click", async () => {
      const path = window.location.pathname;
      const autoPrompt =
        /prompt-generator/.test(path)
          ? "Create high quality values for topic, audience and goal for a landing page AI prompt. Return plain lines as key:value."
          : /prompt-optimizer/.test(path)
          ? "Rewrite current input into a better prompt. Keep concise and actionable."
          : /token-counter/.test(path)
          ? "Suggest a shorter version of the current input with same meaning."
          : /code-explainer/.test(path)
          ? "Explain current code in 5 bullet points for beginners."
          : "Analyze this page and provide best next action for the user.";
      if (input) input.value = autoPrompt;
      await runAgent();
      const pairs = parseAutoFill(lastAssistantText);
      let filled = 0;
      pairs.forEach((p) => {
        if (applyToBestField(p.key, p.value)) filled += 1;
      });
      const hit = autoRunTool();
      appendMsg(`Autopilot done. Filled ${filled} fields.${hit ? ` Ran ${hit}.` : ""}`);
    });

    voice?.addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        appendMsg("Voice input is not supported in this browser.");
        return;
      }
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const t = ev?.results?.[0]?.[0]?.transcript || "";
        if (input) input.value = String(t);
      };
      rec.onerror = () => appendMsg("Voice input failed. Try again.");
      rec.start();
    });
  })();

  (function initToolAIPowerBar() {
    const slug = toolSlugFromPath(window.location.pathname);
    if (!slug) return; // only on tool pages
    const toolHead = document.querySelector(".tool-head");
    if (!toolHead || document.getElementById("tool-ai-power")) return;

    const bar = document.createElement("div");
    bar.id = "tool-ai-power";
    bar.className = "tool-ai-power";
    bar.innerHTML = `
      <div class="rowline">
        <strong>AI Power (Ollama)</strong>
        <span class="state"><span id="tool-ai-dot" class="dot"></span><span id="tool-ai-state">Checking...</span></span>
      </div>
      <div class="actions" style="margin-top:8px">
        <button type="button" class="btn btn-small btn-primary" id="tool-ai-enable">Enable Local AI</button>
        <button type="button" class="btn btn-small" id="tool-ai-open">Open AI Agent</button>
        <button type="button" class="btn btn-small" id="tool-ai-explain">Analyze This Tool Page</button>
      </div>
    `;
    toolHead.appendChild(bar);

    const dot = bar.querySelector("#tool-ai-dot");
    const state = bar.querySelector("#tool-ai-state");
    const enableBtn = bar.querySelector("#tool-ai-enable");
    const openBtn = bar.querySelector("#tool-ai-open");
    const explainBtn = bar.querySelector("#tool-ai-explain");

    const refreshState = async () => {
      try {
        const ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
        const s = ai.getLocalAISettings();
        if (!s.enabled) {
          if (dot) dot.classList.remove("ok");
          if (state) state.textContent = "Local AI is OFF";
          return;
        }
        try {
          const models = await ai.listLocalModels();
          if (dot) dot.classList.add("ok");
          if (state) state.textContent = models.length ? `ON • ${models[0]}` : "ON • no model";
        } catch {
          if (dot) dot.classList.remove("ok");
          if (state) state.textContent = "ON but endpoint not reachable";
        }
      } catch {
        if (dot) dot.classList.remove("ok");
        if (state) state.textContent = "AI module unavailable";
      }
    };

    enableBtn?.addEventListener("click", async () => {
      try {
        const ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
        const current = ai.getLocalAISettings();
        ai.setLocalAISettings({ ...current, enabled: true });
        await refreshState();
      } catch {
        // ignore
      }
    });

    openBtn?.addEventListener("click", () => {
      const launcher = document.getElementById("site-ai-agent");
      if (launcher) launcher.click();
    });

    explainBtn?.addEventListener("click", () => {
      const launcher = document.getElementById("site-ai-agent");
      if (launcher) launcher.click();
      window.setTimeout(() => {
        const input = document.getElementById("agent-input");
        if (input && "value" in input) {
          input.value = "Explain this tool page simply and tell me exact next steps to use it.";
          input.focus();
        }
      }, 120);
    });

    refreshState();
  })();

  (function initGlobalAIChip() {
    const nav = document.querySelector(".site-nav");
    if (!nav || document.getElementById("ai-global-chip")) return;
    const chip = document.createElement("button");
    chip.id = "ai-global-chip";
    chip.type = "button";
    chip.className = "ai-global-chip";
    chip.innerHTML = '<span class="dot" aria-hidden="true"></span><span id="ai-global-label">AI: checking...</span>';
    chip.setAttribute("aria-label", "Open AI agent");
    nav.appendChild(chip);

    const label = chip.querySelector("#ai-global-label");
    const setState = (text, ok = false) => {
      if (label) label.textContent = text;
      chip.classList.toggle("ok", ok);
    };

    chip.addEventListener("click", () => {
      const launcher = document.getElementById("site-ai-agent");
      if (launcher) launcher.click();
    });

    (async () => {
      try {
        const ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
        const s = ai.getLocalAISettings();
        if (!s.enabled) {
          setState("AI: off");
          return;
        }
        try {
          const models = await ai.listLocalModels();
          setState(models.length ? `AI: ${models[0]}` : "AI: on", true);
        } catch {
          setState("AI: endpoint issue");
        }
      } catch {
        setState("AI: unavailable");
      }
    })();
  })();

  (function initAIBridgeBanner() {
    const ensureBanner = (message, hosted) => {
      let root = document.getElementById("ai-bridge-banner");
      if (!root) {
        root = document.createElement("aside");
        root.id = "ai-bridge-banner";
        root.className = "notice ai-bridge-banner";
        root.setAttribute("role", "status");
        const container = document.querySelector(".container");
        if (container) container.prepend(root);
        else document.body.prepend(root);
      }
      root.innerHTML = `
        <div class="ai-bridge-row">
          <strong>Local AI helper</strong>
          <span class="muted">${hosted ? "Public site mode" : "Local mode"}</span>
        </div>
        <div class="muted">${escapeHtml(message)}</div>
        <div class="actions" style="margin-top:8px">
          <button type="button" class="btn btn-small btn-primary" id="ai-bridge-retry">Retry AI check</button>
          <button type="button" class="btn btn-small" id="ai-bridge-copy">Copy bridge command</button>
        </div>
      `;
      const retryBtn = root.querySelector("#ai-bridge-retry");
      const copyBtn = root.querySelector("#ai-bridge-copy");
      retryBtn?.addEventListener("click", () => window.location.reload());
      copyBtn?.addEventListener("click", async () => {
        try {
          await copyToClipboard("start-ai-bridge.bat");
        } catch {
          // ignore copy failure
        }
      });
      root.style.display = "";
    };

    const hideBanner = () => {
      const root = document.getElementById("ai-bridge-banner");
      if (root) root.style.display = "none";
    };

    (async () => {
      try {
        const ai = await import(new URL("js/ai-provider.js", SITE_ROOT_URL).toString());
        const s = ai.getLocalAISettings();
        if (!s.enabled) {
          hideBanner();
          return;
        }
        try {
          await ai.listLocalModels();
          hideBanner();
        } catch {
          const hosted = window.location.protocol === "https:" && !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || "");
          const msg = hosted
            ? "AI is ON but local endpoint is blocked/unreachable from this hosted page. Run start-ai-bridge.bat once, keep it running, then reload."
            : "AI is ON but endpoint is unreachable. Start Ollama and run start-ai-bridge.bat, then retry.";
          ensureBanner(msg, hosted);
        }
      } catch {
        // ignore
      }
    })();
  })();
  window.addEventListener("toolbox:analytics", (e) => {
    if (e?.detail?.type === "tool_run") {
      renderPopularTools();
      renderRecentTools();
    }
  });

  // ---- PWA: Service worker registration ----
  (function registerServiceWorker() {
    try {
      if (!("serviceWorker" in navigator)) return;
      if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;
      // Register from this site's root so it works on GitHub Pages project paths.
      navigator.serviceWorker
        .register(new URL("sw.js", SITE_ROOT_URL).toString(), {
          scope: new URL("./", SITE_ROOT_URL).pathname,
        })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {
          // ignore
        });
    } catch {
      // ignore
    }
  })();
})();

