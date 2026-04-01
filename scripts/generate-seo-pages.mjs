/**
 * Generate long-tail SEO landing pages and a guides hub.
 * White-hat only: helpful content + internal linking to real tools.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SEO_DIR = path.join(ROOT, "seo");
const SITE = "https://toolgarage.netlify.app";

const topics = [
  {
    slug: "ai-prompt-generator-free",
    title: "AI Prompt Generator Free: Templates and Workflow",
    keyword: "ai prompt generator free",
    description:
      "Use this AI prompt generator free guide to write better prompts, improve output quality, and speed up GPT workflows with practical templates and examples.",
    toolLinks: [
      ["Prompt Generator", "../tools/prompt-generator/index.html"],
      ["Prompt Optimizer", "../tools/prompt-optimizer/index.html"],
      ["Token Counter", "../tools/token-counter/index.html"],
    ],
    faqs: [
      ["What is an AI prompt generator?", "It structures context, tasks, and constraints so AI models return more accurate and usable output."],
      ["Can I use this with ChatGPT?", "Yes, this format works well with ChatGPT and most modern LLM tools."],
      ["How do I improve prompts quickly?", "Use a fixed template, define output format, and include examples whenever possible."],
    ],
  },
  {
    slug: "gpt-token-counter",
    title: "GPT Token Counter: Estimate Cost and Context",
    keyword: "gpt token counter",
    description:
      "Use this GPT token counter guide to estimate token usage, control prompt cost, and optimize context windows before sending requests to AI models.",
    toolLinks: [
      ["Token Counter", "../tools/token-counter/index.html"],
      ["Prompt Optimizer", "../tools/prompt-optimizer/index.html"],
      ["Prompt Generator", "../tools/prompt-generator/index.html"],
    ],
    faqs: [
      ["Why should I count tokens?", "It helps reduce API cost, avoid context overflows, and improve response consistency."],
      ["Is character-based token estimation exact?", "No, it is approximate, but it is very useful for fast planning before sending prompts."],
      ["What is a simple estimate rule?", "A practical rule of thumb is around one token for four English characters."],
    ],
  },
  {
    slug: "explain-code-online",
    title: "Explain Code Online: Understand Snippets Faster",
    keyword: "explain code online",
    description:
      "Explain code online with a simple workflow that turns complex snippets into plain-language steps, key functions, and practical understanding for faster debugging.",
    toolLinks: [
      ["Code Explainer", "../tools/code-explainer/index.html"],
      ["JSON Formatter", "../tools/json-formatter/index.html"],
      ["Prompt Optimizer", "../tools/prompt-optimizer/index.html"],
    ],
    faqs: [
      ["Who should use a code explainer?", "Developers, QA engineers, students, and technical writers who need fast understanding of unfamiliar code."],
      ["Can this help debugging?", "Yes, breaking logic into steps often reveals hidden assumptions and edge cases quickly."],
      ["What languages are useful here?", "It works best with common languages such as JavaScript, Python, Java, C++, HTML, and CSS."],
    ],
  },
  {
    slug: "paraphrasing-tool-free",
    title: "Paraphrasing Tool Free: Rewrite with Better Clarity",
    keyword: "paraphrasing tool free",
    description:
      "Learn how to use a paraphrasing tool free to rewrite content clearly, preserve meaning, and improve readability for blogs, emails, and SEO drafts.",
    toolLinks: [
      ["Paraphraser", "../tools/paraphraser/index.html"],
      ["AI Humanizer", "../tools/ai-humanizer/index.html"],
      ["Plagiarism Checker", "../tools/plagiarism-checker/index.html"],
    ],
    faqs: [
      ["Will paraphrasing keep original meaning?", "A good paraphrasing workflow keeps the core intent while improving sentence flow and tone."],
      ["Can I use paraphrased text for SEO?", "Yes, when quality is high, readability and user engagement can improve significantly."],
      ["How do I avoid robotic rewrites?", "Use a paraphraser first, then refine voice with an AI humanizer pass."],
    ],
  },
  {
    slug: "ai-humanizer-online",
    title: "AI Humanizer Online: Make Text Sound Natural",
    keyword: "ai humanizer online",
    description:
      "Use an AI humanizer online workflow to reduce robotic tone, improve readability, and make AI-generated drafts feel natural and audience-friendly.",
    toolLinks: [
      ["AI Humanizer", "../tools/ai-humanizer/index.html"],
      ["Paraphraser", "../tools/paraphraser/index.html"],
      ["Prompt Generator", "../tools/prompt-generator/index.html"],
    ],
    faqs: [
      ["Does humanizing change meaning?", "It should preserve meaning while improving rhythm, sentence variety, and readability."],
      ["Is this useful for marketing copy?", "Yes, it helps emails, landing pages, product text, and social posts sound more human."],
      ["What is the best workflow?", "Generate or paraphrase first, then humanize and manually review final tone."],
    ],
  },
  {
    slug: "keyword-density-checker-tool",
    title: "Keyword Density Checker Tool for Better On-Page SEO",
    keyword: "keyword density checker tool",
    description:
      "Use a keyword density checker tool to understand term frequency, avoid over-optimization, and write balanced content that stays readable.",
    toolLinks: [
      ["Keyword Density Checker", "../tools/keyword-density-checker/index.html"],
      ["SERP Preview", "../tools/serp-preview/index.html"],
      ["Plagiarism Checker", "../tools/plagiarism-checker/index.html"],
    ],
    faqs: [
      ["What is ideal keyword density?", "There is no fixed perfect value; natural placement and topical relevance matter more than exact percentages."],
      ["Can high density hurt rankings?", "Yes, aggressive repetition can reduce readability and may look like keyword stuffing."],
      ["How should I use density data?", "Use it as guidance, then edit naturally for user intent and semantic coverage."],
    ],
  },
  {
    slug: "serp-preview-tool",
    title: "SERP Preview Tool: Improve Title and Meta CTR",
    keyword: "serp preview tool",
    description:
      "Use a SERP preview tool to test title and meta description appearance, improve click-through rate, and avoid truncation in search results.",
    toolLinks: [
      ["SERP Preview", "../tools/serp-preview/index.html"],
      ["Keyword Density Checker", "../tools/keyword-density-checker/index.html"],
      ["Prompt Generator", "../tools/prompt-generator/index.html"],
    ],
    faqs: [
      ["Why use a SERP preview before publishing?", "It helps you optimize titles and descriptions for better readability and click potential."],
      ["Does preview guarantee rankings?", "No, but it improves snippet quality and can positively affect CTR over time."],
      ["How often should metadata be updated?", "Review metadata regularly for top pages based on query performance and intent shifts."],
    ],
  },
  {
    slug: "plagiarism-checker-free",
    title: "Plagiarism Checker Free: Spot Repetition and Duplicates",
    keyword: "plagiarism checker free",
    description:
      "Use a plagiarism checker free workflow to detect duplicate passages, reduce repetitive wording, and improve originality before publishing.",
    toolLinks: [
      ["Plagiarism Checker", "../tools/plagiarism-checker/index.html"],
      ["Paraphraser", "../tools/paraphraser/index.html"],
      ["AI Humanizer", "../tools/ai-humanizer/index.html"],
    ],
    faqs: [
      ["Why check duplication before publishing?", "Duplicate sections can hurt quality perception and reduce content uniqueness."],
      ["Can this improve SEO quality?", "Original and useful content generally performs better in search over the long term."],
      ["What should I do after finding duplicates?", "Rewrite with paraphrasing and a humanization pass, then re-check."],
    ],
  },
  {
    slug: "image-compressor-online",
    title: "Image Compressor Online: Faster Pages, Better UX",
    keyword: "image compressor online",
    description:
      "Use an image compressor online to reduce image size, improve page speed, and enhance user experience without major quality loss.",
    toolLinks: [
      ["Image Compressor", "../tools/image-compressor/index.html"],
      ["SERP Preview", "../tools/serp-preview/index.html"],
      ["Unit Converter", "../tools/unit-converter/index.html"],
    ],
    faqs: [
      ["Why does image size matter for SEO?", "Smaller assets improve load speed and user experience, which supports better performance signals."],
      ["Will compression ruin quality?", "Modern compression settings usually keep quality acceptable for web content."],
      ["Which format should I use?", "WebP often provides strong compression and quality balance for web delivery."],
    ],
  },
  {
    slug: "strong-password-generator",
    title: "Strong Password Generator for Better Security Hygiene",
    keyword: "strong password generator",
    description:
      "Use a strong password generator to create unique credentials with configurable length, symbols, and character sets for better account safety.",
    toolLinks: [
      ["Password Generator", "../tools/password-generator/index.html"],
      ["Hash Generator", "../tools/hash-generator/index.html"],
      ["HMAC Generator", "../tools/hmac-generator/index.html"],
    ],
    faqs: [
      ["What makes a password strong?", "Length, randomness, and uniqueness are the core factors for stronger passwords."],
      ["Should I reuse passwords?", "No, each account should have a different password to limit breach impact."],
      ["Are symbols necessary?", "Including symbols usually increases entropy and makes brute-force attacks harder."],
    ],
  },
  {
    slug: "unit-converter-online",
    title: "Unit Converter Online for Daily Conversion Tasks",
    keyword: "unit converter online",
    description:
      "Use a unit converter online for instant length, weight, temperature, data, and time conversions with a simple browser workflow.",
    toolLinks: [
      ["Unit Converter", "../tools/unit-converter/index.html"],
      ["Timestamp Converter", "../tools/timestamp-converter/index.html"],
      ["Timezone Converter", "../tools/timezone-converter/index.html"],
    ],
    faqs: [
      ["What can a unit converter handle?", "Typical converters support length, weight, temperature, data storage, and time units."],
      ["Is conversion instant?", "Yes, browser-based converters update results immediately as values change."],
      ["Can I use this on mobile?", "Yes, responsive converter pages are designed for desktop and mobile use."],
    ],
  },
  {
    slug: "json-formatter-online",
    title: "JSON Formatter Online: Validate and Beautify Fast",
    keyword: "json formatter online",
    description:
      "Use a JSON formatter online to validate payloads, prettify structure, and debug API responses faster with readable formatting.",
    toolLinks: [
      ["JSON Formatter", "../tools/json-formatter/index.html"],
      ["JSON Flattener", "../tools/json-flattener/index.html"],
      ["CSV JSON Converter", "../tools/csv-json-converter/index.html"],
    ],
    faqs: [
      ["Why format JSON before debugging?", "Readable structure helps spot syntax errors and nested field issues faster."],
      ["Can formatting break data?", "Formatting changes presentation only and should not alter valid data values."],
      ["Is it useful for API testing?", "Yes, formatted payloads improve clarity in development and QA workflows."],
    ],
  },
];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicParagraphs(topic) {
  return `
          <p>People searching for <strong>${esc(topic.keyword)}</strong> usually have immediate intent and want a direct solution. This page is built to solve that quickly with practical guidance and direct access to useful browser tools. Instead of generic theory, the focus is on repeatable steps that improve outcomes in real workflows.</p>
          <p>To rank sustainably, content should satisfy user intent first, then guide readers to the right actions. That means clear explanations, useful examples, and relevant internal links to tools that complete the task. This approach improves engagement quality and helps search engines understand topical depth across related pages.</p>
          <p>Use the linked tools below to move from learning to execution. Keep pages updated based on actual query performance in Search Console, refresh metadata for top pages, and expand only where user demand is proven. This gives you a durable growth model rather than short-lived ranking spikes.</p>
  `.trim();
}

function pageHtml(topic) {
  const canonical = `${SITE}/seo/${topic.slug}.html`;
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: topic.faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const webPageJson = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: topic.title,
    url: canonical,
    description: topic.description,
  };
  const linksHtml = topic.toolLinks
    .map(([label, href]) => `<li><a href="${href}">${esc(label)}</a></li>`)
    .join("");
  const faqHtml = topic.faqs
    .map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-43KGB1VEBE"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-43KGB1VEBE');
    </script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${esc(topic.description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonical}" />
    <title>${esc(topic.title)}</title>
    <link rel="stylesheet" href="../css/styles.css" />
    <script type="application/ld+json">${JSON.stringify(webPageJson)}</script>
    <script type="application/ld+json">${JSON.stringify(faqJson)}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container header-row">
        <div class="brand">
          <a class="brand-link" href="../" aria-label="Toolbox home">
            <span class="brand-mark" aria-hidden="true">TB</span>
            <span class="brand-text">Toolbox</span>
          </a>
          <span class="brand-sub">Developer tools</span>
        </div>
        <nav class="site-nav" aria-label="Primary">
          <a href="../#tools">Tools</a>
          <a href="./index.html">SEO Guides</a>
          <a href="../#about">About</a>
        </nav>
      </div>
    </header>

    <main id="main" class="container">
      <section class="tool-head">
        <div class="crumbs">
          <a href="../">Home</a><span aria-hidden="true"> / </span><a href="./index.html">SEO Guides</a><span aria-hidden="true"> / </span><span>${esc(topic.keyword)}</span>
        </div>
        <div class="tool-title">
          <h1>${esc(topic.title)}</h1>
          <span class="pill">SEO Guide</span>
        </div>
        <p class="muted">${esc(topic.description)}</p>
      </section>

      <section class="section">
        <h2>How to Use This Keyword</h2>
        <div class="prose">
${topicParagraphs(topic)}
        </div>
      </section>

      <section class="section">
        <h2>Recommended Tools</h2>
        <div class="prose">
          <p>Use these tools to complete the workflow quickly:</p>
          <ul>${linksHtml}</ul>
        </div>
      </section>

      <section class="section">
        <h2>FAQs</h2>
        <div class="prose">${faqHtml}</div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-row">
        <small>© <span id="year"></span> Toolbox</small>
        <small class="muted"><a href="../">Back to home</a></small>
      </div>
    </footer>
    <script src="../js/main.js" defer></script>
  </body>
</html>`;
}

function hubHtml(items) {
  const cards = items
    .map(
      (t) => `
          <article class="panel" role="listitem">
            <div class="panel-body">
              <h3>${esc(t.title)}</h3>
              <p class="muted">${esc(t.description)}</p>
              <div class="actions">
                <a class="btn btn-small" href="./${t.slug}.html">Open Guide</a>
              </div>
            </div>
          </article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-43KGB1VEBE"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-43KGB1VEBE');
    </script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Browse Toolbox SEO guides for high-intent keyword workflows linked to practical free online tools." />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${SITE}/seo/index.html" />
    <title>SEO Guides - Toolbox</title>
    <link rel="stylesheet" href="../css/styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container header-row">
        <div class="brand">
          <a class="brand-link" href="../" aria-label="Toolbox home">
            <span class="brand-mark" aria-hidden="true">TB</span>
            <span class="brand-text">Toolbox</span>
          </a>
          <span class="brand-sub">Developer tools</span>
        </div>
        <nav class="site-nav" aria-label="Primary">
          <a href="../#tools">Tools</a>
          <a href="../#about">About</a>
        </nav>
      </div>
    </header>

    <main id="main" class="container">
      <section class="tool-head">
        <div class="crumbs">
          <a href="../">Home</a><span aria-hidden="true"> / </span><span>SEO Guides</span>
        </div>
        <div class="tool-title">
          <h1>SEO Guides</h1>
          <span class="pill">Growth Hub</span>
        </div>
        <p class="muted">High-intent keyword pages connected to real tools and practical workflows.</p>
      </section>

      <section class="section" aria-label="SEO guides">
        <h2>All Guides</h2>
        <div class="grid" role="list">
${cards}
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-row">
        <small>© <span id="year"></span> Toolbox</small>
        <small class="muted"><a href="../">Back to home</a></small>
      </div>
    </footer>
    <script src="../js/main.js" defer></script>
  </body>
</html>`;
}

fs.mkdirSync(SEO_DIR, { recursive: true });
for (const topic of topics) {
  const abs = path.join(SEO_DIR, `${topic.slug}.html`);
  fs.writeFileSync(abs, pageHtml(topic), "utf8");
  console.log("Generated", path.relative(ROOT, abs));
}
const hub = path.join(SEO_DIR, "index.html");
fs.writeFileSync(hub, hubHtml(topics), "utf8");
console.log("Generated", path.relative(ROOT, hub));
console.log("Done.", topics.length + 1, "SEO pages generated.");
