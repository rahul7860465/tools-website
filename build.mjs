import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(relPath) {
  const src = path.join(root, relPath);
  const dst = path.join(dist, relPath);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function listToolDirs() {
  const toolsDir = path.join(root, "tools");
  return fs
    .readdirSync(toolsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listHtmlFilesRecursively(relDir) {
  const absDir = path.join(root, relDir);
  if (!fs.existsSync(absDir)) return [];
  const out = [];
  const walk = (absBase, relBase) => {
    const items = fs.readdirSync(absBase, { withFileTypes: true });
    for (const item of items) {
      const absPath = path.join(absBase, item.name);
      const relPath = path.join(relBase, item.name);
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

function cleanDist() {
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  ensureDir(dist);
}

cleanDist();

// Copy HTML (keeps relative paths working inside dist/)
copyFile("index.html");
copyFile("pricing.html");
copyFile("tools/_tool-template.html");
copyFile("tools.json");
copyFile("featureFlags.json");
copyFile("manifest.json");
copyFile("sw.js");
copyFile("sitemap.xml");
copyFile("robots.txt");
copyFile("googleac8c94696f9b1477.html");

for (const tool of listToolDirs()) {
  copyFile(`tools/${tool}/index.html`);
}
for (const seoHtml of listHtmlFilesRecursively("seo")) {
  copyFile(seoHtml);
}

// Build + minify JS/CSS into dist/, preserving paths.
const entryPoints = [
  "js/main.js",
  "js/toolkit.js",
  "js/tool-loader.js",
  "css/styles.css",
  ...listToolDirs().map((tool) => `tools/${tool}/tool.js`),
];

await build({
  absWorkingDir: root,
  entryPoints,
  outdir: dist,
  outbase: ".",
  bundle: true,
  splitting: true,
  format: "esm",
  target: ["es2019"],
  minify: true,
  sourcemap: false,
  logLevel: "info",
});

console.log("Build complete:", dist);

