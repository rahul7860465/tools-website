# Toolbox Site

High-performance, client-side-first AI and utility tools hub with optional Local AI (Ollama), SEO automation, and Playwright quality gates.

## Overview

Toolbox is a browser-based tools platform built with plain HTML, CSS, and JavaScript.  
It focuses on:

- Fast UX and no-login usage
- Mostly client-side processing for privacy
- Optional Local AI via Ollama (`http://localhost:11434`)
- Strong SEO structure (metadata, schema, sitemap automation)
- Reliable testing with Playwright

## Current Highlights

- 50+ online tools across AI, SEO, Utility, and Developer workflows
- Premium homepage sections (AI Workspace, Featured AI Workflows, Tool Explorer)
- Tool-to-tool workflow actions:
  - Share link (state in URL hash)
  - Send output to another tool
- Local AI streaming with stop/cancel support in key AI tools
- Programmatic SEO page generation and sitemap refresh scripts

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (ESM)
- Bundling: `esbuild`
- Testing: `@playwright/test`
- Local AI (optional): Ollama HTTP API

## Project Structure

- `index.html` - Homepage and tool discovery UX
- `tools/<tool-id>/index.html` - Individual tool pages
- `tools/<tool-id>/tool.js` - Tool-specific logic
- `js/main.js` - Global/homepage logic
- `js/toolkit.js` - Shared utilities and workflow helpers
- `js/ai-provider.js` - Local AI settings, calls, streaming, retry/timeout
- `css/styles.css` - Global styles
- `tools.json` - Tool registry (source of truth)
- `scripts/` - SEO and sitemap automation
- `tests/` - Playwright suites
- `build.mjs` - Build pipeline to `dist/`

## Prerequisites

- Node.js 18+ recommended
- npm
- (Optional) Ollama installed and running locally

## Installation

```bash
npm install
```

## Run Commands

- Build:
```bash
npm run build
```

- Preview local source:
```bash
npm run preview
```

- Preview built output (`dist`):
```bash
npm run preview:dist
```

- Run all tests:
```bash
npm test
```

- Open Playwright UI:
```bash
npm run test:ui
```

## SEO Automation Commands

- Tool-page SEO block generation:
```bash
npm run seo
```

- Programmatic SEO landing page generation:
```bash
npm run seo:generate
```

- Head metadata boost (OG/Twitter/hreflang/site schema):
```bash
npm run seo:boost
```

- Sitemap refresh:
```bash
npm run sitemap:refresh
```

Recommended sequence:

```bash
npm run seo:generate
npm run seo:boost
npm run sitemap:refresh
npm run build
```

## Local AI (Ollama) Setup

1. Start Ollama locally:
```bash
ollama serve
```

2. Pull at least one model (example):
```bash
ollama pull llama3.2:latest
```

3. Open an AI tool page:
   - `tools/prompt-generator`
   - `tools/prompt-optimizer`
   - `tools/code-explainer`

4. Expand **Local AI (Ollama)** panel and configure:
   - Endpoint: `http://localhost:11434`
   - Model: your local model
   - Enable Local AI

## Reliability and Quality

- Streaming responses support stop/cancel actions
- Retry + timeout behavior for Local AI requests
- Fallback to deterministic local logic when AI is unavailable
- E2E flows tested:
  - Share-link restore
  - Send-output cross-tool flow
  - Stop-streaming behavior
  - Local AI network-failure fallback

## Deployment Notes

- Domain currently aligned to:
  - `https://toolgarage.netlify.app`
- Ensure deployed artifacts include:
  - `sitemap.xml`
  - `robots.txt`
  - SEO landing pages under `seo/`
  - tool pages under `tools/`

## Security and Privacy

- Core tools run in browser
- Local AI mode sends prompts to local Ollama endpoint only
- No mandatory backend required for core functionality

## Known Scope

- This project is currently frontend-only (except local machine Ollama integration)
- Multi-user auth, cloud sync, and server APIs are not part of current baseline

## Contribution Workflow

1. Make changes
2. Run:
```bash
npm run build
npm test
```
3. Validate responsive behavior and key AI flows before release

