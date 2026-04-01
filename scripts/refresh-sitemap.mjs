/**
 * Rebuild sitemap.xml from tools.json with lastmod and changefreq.
 * Run:
 *   node scripts/refresh-sitemap.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE = "https://toolgarage.netlify.app";
const today = new Date().toISOString().slice(0, 10);

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

const seoPages = listHtmlFilesRecursively("seo")
  .map((rel) => `${SITE}/${String(rel).replaceAll("\\", "/")}`)
  .sort();

function row(loc, priority, changefreq = "weekly") {
  const priorityLine = priority ? `\n    <priority>${priority}</priority>` : "";
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>${priorityLine}\n  </url>`;
}

const lines = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  row(`${SITE}/`, "1.0", "daily"),
  row(`${SITE}/pricing.html`, "0.8", "weekly"),
  ...tools.map((t) => row(`${SITE}/tools/${t.id}/index.html`, "0.7", "weekly")),
  ...seoPages.map((url) => row(url, "0.8", "weekly")),
  `</urlset>`,
  ``,
];

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), lines.join("\n"), "utf8");
console.log(`Sitemap refreshed. ${tools.length + 2 + seoPages.length} URLs.`);
