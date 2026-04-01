/**
 * Adds advanced head SEO tags across site pages:
 * - Open Graph
 * - Twitter card
 * - hreflang alternates
 * - WebSite + Organization JSON-LD on homepage
 *
 * Run from repo root:
 *   node scripts/boost-seo-head.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE = "https://toolgarage.netlify.app";

const toolsJson = JSON.parse(fs.readFileSync(path.join(ROOT, "tools.json"), "utf8"));
const tools = toolsJson.tools || [];

function listHtmlFilesRecursively(relDir) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return [];
  const out = [];
  const walk = (baseAbs, baseRel) => {
    const items = fs.readdirSync(baseAbs, { withFileTypes: true });
    for (const item of items) {
      const absPath = path.join(baseAbs, item.name);
      const relPath = path.join(baseRel, item.name);
      if (item.isDirectory()) {
        walk(absPath, relPath);
      } else if (item.isFile() && item.name.toLowerCase().endsWith(".html")) {
        out.push(relPath);
      }
    }
  };
  walk(absDir, relDir);
  return out;
}

const seoPages = listHtmlFilesRecursively("seo").map((relPath) => ({
  relPath,
  canonical: `${SITE}/${String(relPath).replaceAll("\\", "/")}`,
  isHome: false,
}));

const pages = [
  { relPath: "index.html", canonical: `${SITE}/`, isHome: true },
  { relPath: "pricing.html", canonical: `${SITE}/pricing.html`, isHome: false },
  ...tools.map((t) => ({
    relPath: path.join("tools", t.id, "index.html"),
    canonical: `${SITE}/tools/${t.id}/index.html`,
    isHome: false,
  })),
  ...seoPages,
];

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return (m ? m[1] : "Toolbox").trim();
}

function readDescription(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i);
  return (m ? m[1] : "Fast browser-based tools.").trim();
}

function upsertMetaProperty(html, property, content) {
  const re = new RegExp(`<meta\\s+property="${property.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const line = `    <meta property="${property}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, line);
  return html;
}

function upsertMetaName(html, name, content) {
  const re = new RegExp(`<meta\\s+name="${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const line = `    <meta name="${name}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, line);
  return html;
}

function upsertHeadSeo(html, canonical, isHome) {
  const title = readTitle(html);
  const desc = readDescription(html);

  html = html.replace(/\s*<!-- seo-social -->[\s\S]*?<!-- end seo-social -->\s*/g, "");
  html = html.replace(/\s*<!-- seo-alt-lang -->[\s\S]*?<!-- end seo-alt-lang -->\s*/g, "");
  html = html.replace(/\s*<!-- seo-site-jsonld -->[\s\S]*?<!-- end seo-site-jsonld -->\s*/g, "");

  html = upsertMetaProperty(html, "og:type", "website");
  html = upsertMetaProperty(html, "og:site_name", "Toolbox");
  html = upsertMetaProperty(html, "og:title", title.replace(/&ndash;/g, "-").replace(/&amp;/g, "&"));
  html = upsertMetaProperty(html, "og:description", desc);
  html = upsertMetaProperty(html, "og:url", canonical);

  html = upsertMetaName(html, "twitter:card", "summary");
  html = upsertMetaName(html, "twitter:title", title.replace(/&ndash;/g, "-").replace(/&amp;/g, "&"));
  html = upsertMetaName(html, "twitter:description", desc);

  const socialBlock = `    <!-- seo-social -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Toolbox" />
    <meta property="og:title" content="${escapeAttr(title.replace(/&ndash;/g, "-").replace(/&amp;/g, "&"))}" />
    <meta property="og:description" content="${escapeAttr(desc)}" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeAttr(title.replace(/&ndash;/g, "-").replace(/&amp;/g, "&"))}" />
    <meta name="twitter:description" content="${escapeAttr(desc)}" />
    <!-- end seo-social -->`;

  const altBlock = `    <!-- seo-alt-lang -->
    <link rel="alternate" hreflang="en" href="${canonical}" />
    <link rel="alternate" hreflang="x-default" href="${canonical}" />
    <!-- end seo-alt-lang -->`;

  let siteJsonLdBlock = "";
  if (isHome) {
    const website = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Toolbox",
      url: `${SITE}/`,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/#tools`,
        "query-input": "required name=search_term_string",
      },
    };
    const org = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Toolbox",
      url: `${SITE}/`,
      logo: `${SITE}/favicon.ico`,
    };
    siteJsonLdBlock = `    <!-- seo-site-jsonld -->
    <script type="application/ld+json">${JSON.stringify(website)}</script>
    <script type="application/ld+json">${JSON.stringify(org)}</script>
    <!-- end seo-site-jsonld -->`;
  }

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${socialBlock}\n${altBlock}${siteJsonLdBlock ? `\n${siteJsonLdBlock}` : ""}\n  </head>`);
  }
  return html;
}

for (const page of pages) {
  const abs = path.join(ROOT, page.relPath);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, "utf8");
  const out = upsertHeadSeo(src, page.canonical, page.isHome);
  fs.writeFileSync(abs, out, "utf8");
  console.log("Updated", page.relPath);
}

console.log("Done. SEO head boost applied.");
