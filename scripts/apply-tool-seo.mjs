/**
 * Applies SEO title, meta, canonical, JSON-LD, and body content to all tool pages.
 * Run from repo root: node scripts/apply-tool-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CANONICAL_BASE = "https://toolgarage.netlify.app";

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "tools.json"), "utf8"));
const tools = registry.tools || [];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTitle(name) {
  const candidates = [
    () => `Free ${name} Online – Fast & Easy | Toolbox`,
    () => `Free ${name} Online – Fast | Toolbox`,
    () => `Free ${name} Online | Toolbox`,
    () => `${name} – Free Online | Toolbox`,
    () => `${name} Free Online | Toolbox`,
  ];
  for (const fn of candidates) {
    const t = fn();
    if (t.length <= 60) return t;
  }
  return `Free ${name.slice(0, 28)}… Online | Toolbox`.slice(0, 60);
}

function buildMeta(tool) {
  let t = `${tool.description} Use Toolbox’s free ${tool.name} in your browser—private, fast, no signup.`;
  if (t.length < 140) t += ` Works offline after first load where supported.`;
  if (t.length < 140) t += ` Part of our ${tool.category} collection.`;
  if (t.length < 140) t += ` Client-side processing on your device.`;
  if (t.length < 140) {
    const pad = " Secure and lightweight.";
    let i = 0;
    while (t.length < 140 && i < 6) {
      t += pad;
      i++;
    }
  }
  if (t.length > 160) t = t.slice(0, 157).trim() + "...";
  return t;
}

function pickRelated(currentId, n = 5) {
  const cur = tools.find((x) => x.id === currentId);
  const same = tools.filter((t) => t.id !== currentId && cur && t.category === cur.category);
  const other = tools.filter((t) => t.id !== currentId && (!cur || t.category !== cur.category));
  const merged = [...same, ...other];
  return merged.slice(0, n);
}

function internalLinksHtml(currentId, related) {
  const picks = related.slice(0, 4);
  if (!picks.length) return "";
  const parts = picks.map(
    (t) => `<a href="../${t.id}/index.html">${escapeHtml(t.name)}</a>`
  );
  if (parts.length === 1) return `You may also try ${parts[0]}.`;
  return `You may also try ${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.`;
}

function wordCount(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildLongArticle(tool, linksSentence) {
  const name = tool.name;
  const desc = tool.description;
  const cat = tool.category;
  const paras = [];
  paras.push(
    `<p>The <strong>${escapeHtml(name)}</strong> on Toolbox helps you ${escapeHtml(desc.toLowerCase().replace(/\.$/, ""))}. Whether you are debugging production issues, preparing test data, or learning how formats work, this page gives you a focused workspace that runs directly in your browser without installing desktop software.</p>`
  );
  paras.push(
    `<p>Toolbox is built for developers, QA engineers, technical writers, and students who need quick, repeatable utilities. Because processing happens client-side in most tools, your inputs stay on your device for typical workflows—ideal when you want to avoid sending sensitive snippets to unknown servers. The interface stays minimal so you can paste, transform, and copy results in seconds.</p>`
  );
  paras.push(
    `<p>This tool sits in our <strong>${escapeHtml(cat)}</strong> category alongside other utilities you can combine in real workflows. For example, you might validate output from one step, transform it with another, and share a clean diff with your team. Keeping everything in one toolbox reduces context switching and bookmark sprawl.</p>`
  );
  paras.push(
    `<p><strong>Practical uses:</strong> use ${escapeHtml(name)} when you need to ${escapeHtml(
      desc.replace(/\.$/, "").toLowerCase()
    )} during API integration, log investigation, content cleanup, or security reviews. Pair it with related utilities when your task spans encoding, formatting, or comparison—see the links below for ideas.</p>`
  );
  paras.push(`<p>${linksSentence}</p>`);
  paras.push(
    `<p>For best results, start with a small sample, confirm the output matches expectations, then scale to larger inputs while watching browser performance. Most Toolbox pages include copy actions and clear steps so you can move quickly. If you rely on this workflow often, bookmark the page or install the site as a PWA where supported for faster return visits.</p>`
  );
  paras.push(
    `<p>We keep the experience fast and lightweight: no accounts are required for standard use, and the layout works on common desktop and mobile browsers. If something looks off, try a different browser profile or disable extensions that block scripts, since Toolbox uses modern JavaScript features for crypto, formatting, and parsing tasks.</p>`
  );
  let html = paras.join("\n");
  let wc = wordCount(html);
  while (wc < 400) {
    html += `\n<p>Toolbox continues to expand with developer-focused utilities that follow the same privacy-minded, in-browser philosophy. ${escapeHtml(
      name
    )} is maintained to stay useful alongside ${escapeHtml(cat)} workflows and complements other tools you may already use in your stack.</p>`;
    wc = wordCount(html);
    if (html.length > 12000) break;
  }
  while (wc > 500) {
    html = html.replace(/<p>[\s\S]*?<\/p>\s*$/, "");
    wc = wordCount(html);
  }
  return html;
}

function buildFaqs(tool) {
  const name = tool.name;
  return [
    {
      q: `Is the ${name} tool free to use?`,
      a: `Yes. Toolbox provides ${name} free of charge in your browser. There is no paywall for standard use of this page.`,
    },
    {
      q: `Does my data leave my browser when I use ${name}?`,
      a: `Toolbox tools are designed to run client-side in your browser for typical operations, so your input is not sent to our servers for processing in those flows. Always verify behavior for your specific workflow and avoid pasting highly sensitive secrets if you are unsure.`,
    },
    {
      q: `Can I use ${name} offline?`,
      a: `After the site assets are cached (for example via a PWA install or repeat visits), many Toolbox pages can work without a network connection. You still need an initial online load to fetch scripts and styles.`,
    },
    {
      q: `Which browsers work with ${name}?`,
      a: `Use an up-to-date version of Chrome, Edge, Firefox, or Safari. Some tools rely on Web Crypto or modern JavaScript—keep your browser current for best results.`,
    },
    {
      q: `How is Toolbox ${name} different from desktop apps?`,
      a: `You get instant access without installation, quick copy-and-paste workflows, and a consistent UI with the rest of Toolbox. Desktop tools may offer larger files or plugins; use this page when you need speed and simplicity.`,
    },
  ];
}

function buildJsonLd(tool, canonical, faqs) {
  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: buildMeta(tool),
    url: canonical,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(webApp)}</script>\n    <script type="application/ld+json">${JSON.stringify(faqPage)}</script>`;
}

function buildSeoBlock(tool) {
  const related = pickRelated(tool.id, 8);
  const linksSentence = internalLinksHtml(tool.id, related);
  const faqs = buildFaqs(tool);
  const faqHtml = faqs
    .map((f) => `          <h3>${escapeHtml(f.q)}</h3>\n          <p>${escapeHtml(f.a)}</p>`)
    .join("\n\n");

  const whatIsHtml = `
          <p>The <strong>${escapeHtml(tool.name)}</strong> is a browser-based utility that helps you ${escapeHtml(
            tool.description.replace(/\.$/, "").toLowerCase()
          )}. It is designed for developers, QA engineers, students, and teams who want quick, reliable output without installing heavy software. Because it lives inside Toolbox, you get a focused interface and consistent workflow that fits naturally into day-to-day debugging, testing, and content-cleanup tasks.</p>`;

  const whyUseHtml = `
          <p>Use ${escapeHtml(
            tool.name
          )} when speed, simplicity, and privacy matter. The page is built for fast copy-paste workflows: enter input, run the action, verify output, and continue your work. For typical use cases, processing stays in your browser, which helps keep data local. ${linksSentence} That connected tool flow reduces context switching and makes repeated tasks easier to standardize across projects.</p>`;

  const howItWorksHtml = `
          <p>Start by pasting a small sample into the input area, then click the main action button to process it. Review the result, adjust input if needed, and run again until the output matches your target format. Once validated, copy or export the final result for documentation, QA checks, API testing, or production tasks. This repeatable loop keeps the process clear, fast, and easy to verify.</p>`;

  return `<!-- toolbox-seo -->
      <section class="section" id="tool-seo-whatis" aria-labelledby="h2-whatis">
        <h2 id="h2-whatis">What is a ${escapeHtml(tool.name)} Tool?</h2>
        <div class="prose">
${whatIsHtml}
        </div>
      </section>
      <section class="section" id="tool-seo-whyuse" aria-labelledby="h2-whyuse">
        <h2 id="h2-whyuse">Why Use a ${escapeHtml(tool.name)}?</h2>
        <div class="prose">
${whyUseHtml}
        </div>
      </section>
      <section class="section tool-seo-article" id="tool-seo-how" aria-labelledby="h2-how">
        <h2 id="h2-how">How This Tool Works</h2>
        <div class="prose">
${howItWorksHtml}
        </div>
      </section>
      <section class="section" id="tool-seo-faq" aria-labelledby="h2-faq">
        <h2 id="h2-faq">FAQs</h2>
        <div class="prose">

${faqHtml}
        </div>
      </section>
      <!-- end toolbox-seo -->`;
}

function stripPreviousSeo(html) {
  return html.replace(/<!-- toolbox-seo -->[\s\S]*?<!-- end toolbox-seo -->\s*/g, "");
}

function stripOldHowToSection(html) {
  return html.replace(
    /<section class="section">\s*<h2>How to use this tool<\/h2>[\s\S]*?<\/section>\s*/g,
    ""
  );
}

function upsertHead(html, tool) {
  const title = buildTitle(tool.name);
  const metaDesc = buildMeta(tool);
  const canonical = `${CANONICAL_BASE}/tools/${tool.id}/index.html`;
  const faqs = buildFaqs(tool);
  const jsonLd = buildJsonLd(tool, canonical, faqs);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);

  if (/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i.test(html)) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(metaDesc)}" />`
    );
  } else {
    html = html.replace(
      /<meta\s+name="viewport"[^>]*>/i,
      (m) => `${m}\n    <meta name="description" content="${escapeHtml(metaDesc)}" />`
    );
  }

  if (!/rel="canonical"/i.test(html)) {
    if (/<meta\s+name="robots"[^>]*>/i.test(html)) {
      html = html.replace(
        /<meta\s+name="robots"[^>]*>/i,
        (m) => `${m}\n    <link rel="canonical" href="${canonical}" />`
      );
    } else {
      html = html.replace(
        /<meta\s+name="viewport"[^>]*>/i,
        (m) => `${m}\n    <link rel="canonical" href="${canonical}" />`
      );
    }
  } else {
    html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  }

  html = html.replace(/\s*<!-- seo-jsonld -->[\s\S]*?<!-- end seo-jsonld -->\s*/g, "");
  const jsonldBlock = `    <!-- seo-jsonld -->\n    ${jsonLd}\n    <!-- end seo-jsonld -->`;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${jsonldBlock}\n  </head>`);
  }
  return html;
}

function upsertMain(html, tool) {
  html = stripPreviousSeo(html);
  html = stripOldHowToSection(html);
  html = html.replace(/<section class="section" aria-label="Related tools">[\s\S]*?<\/section>\s*/g, "");
  const block = buildSeoBlock(tool);
  const relatedSection = `      <section class="section" aria-label="Related tools">
        <h2>Related Tools</h2>
        <div id="related-tools" class="grid" role="list"></div>
      </section>`;
  const insert = "\n" + block + "\n" + relatedSection + "\n";
  return html.replace(/<\/main>/i, () => insert + "    </main>");
}

function fixBrandMarkAlt(html, tool) {
  const label = `Toolbox logo — ${tool.name}`;
  return html.replace(
    /<a class="brand-link"([^>]*)>/g,
    (m, attrs) => {
      if (/aria-label=/.test(attrs)) return m;
      return `<a class="brand-link"${attrs} aria-label="${escapeHtml(label)}">`;
    }
  );
}

function processTool(tool) {
  const filePath = path.join(ROOT, "tools", tool.id, "index.html");
  if (!fs.existsSync(filePath)) {
    console.warn("Missing:", filePath);
    return;
  }
  let html = fs.readFileSync(filePath, "utf8");
  html = upsertHead(html, tool);
  html = upsertMain(html, tool);
  html = fixBrandMarkAlt(html, tool);
  fs.writeFileSync(filePath, html, "utf8");
  console.log("OK", tool.id, "title len", buildTitle(tool.name).length, "meta len", buildMeta(tool).length);
}

for (const tool of tools) {
  processTool(tool);
}

console.log("Done.", tools.length, "tools.");
