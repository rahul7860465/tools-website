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
    if (!grid || !search) return;

    const cards = Array.from(grid.querySelectorAll("a.card"));
    const titles = cards.map((c) => c.querySelector("h3"));
    const rawNames = cards.map((c, i) => (c.dataset.toolName || titles[i]?.textContent || "").trim());
    const rawDescs = cards.map((c) => (c.dataset.desc || "").trim());
    const cats = cards.map((c) => String(c.dataset.category || "").trim());
    let page = 1;
    const pageSize = 18;

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

  function renderMainCategorySections() {
    const sections = [
      { sectionId: "ai-tools", gridId: "ai-tool-grid", category: "AI Tools" },
      { sectionId: "seo-tools", gridId: "seo-tool-grid", category: "SEO Tools" },
      { sectionId: "utility-tools", gridId: "utility-tool-grid", category: "Utility Tools" },
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
      badge.textContent = enabled ? "Connected (configured)" : "Offline / disabled";
      badge.classList.remove("ok", "off");
      badge.classList.add(enabled ? "ok" : "off");
    } catch {
      badge.textContent = "Offline / disabled";
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
      renderMainCategorySections();
      initSmartAnalyze();
      initLocalAiBadge();
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
  window.addEventListener("toolbox:analytics", (e) => {
    if (e?.detail?.type === "tool_run") renderPopularTools();
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

