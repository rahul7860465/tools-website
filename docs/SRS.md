# Software Requirements Specification (SRS)

## 1. Document Control

- Product: Toolbox Site
- Type: Client-side AI and utility tools hub
- Version: 1.0
- Date: 2026-04-08

---

## 2. Purpose

Define complete functional and non-functional requirements for Toolbox as a high-quality online tools platform with optional Local AI (Ollama), strong UX, and SEO scalability.

---

## 3. Scope

Toolbox provides:

- Browser-based tools for developers, creators, and SEO users
- AI-assisted flows (optional local model usage)
- Workflow actions (share state, send output between tools)
- SEO-ready pages and programmatic content generation
- Automated quality validation through tests

Out of scope (current phase):

- Multi-tenant cloud backend
- User account auth/roles
- Paid billing backend
- Centralized remote data storage

---

## 4. Stakeholders

- Product owner
- End users (developers, marketers, content creators)
- QA and release engineer
- SEO owner

---

## 5. Definitions

- Local AI: Running AI prompts against local Ollama endpoint on user machine
- Workflow actions: Share-link and send-output cross-tool interactions
- Tool page: `tools/<id>/index.html`
- Registry: `tools.json`

---

## 6. Product Overview

### 6.1 Core Value

- Fast, private, no-login tools platform
- Professional UI with guided workflows
- Resilient AI mode that fails gracefully

### 6.2 Product Components

- Homepage dashboard (`index.html`)
- Tool registry (`tools.json`)
- Individual tool pages and scripts
- Shared JS layers (`main.js`, `toolkit.js`, `ai-provider.js`)
- SEO automation scripts
- Playwright test suites

---

## 7. Functional Requirements

### FR-1: Tool Discovery

- System shall list tools by categories and cards.
- System shall provide searchable/filterable tool explorer.
- System shall provide featured workflow entry points from homepage.

### FR-2: Tool Execution

- Each tool shall execute requested logic in browser.
- Input validation shall prevent invalid operations and show clear status.

### FR-3: Share-Link State

- For upgraded tools, system shall encode state in URL hash.
- User shall be able to copy a shareable URL.
- Opening URL shall restore tool input state where applicable.

### FR-4: Cross-Tool Send Output

- User shall select destination tool from dropdown.
- System shall pass source output into destination input.
- Destination page shall show confirmation status.

### FR-5: Local AI Configuration

- System shall support enabling/disabling local AI mode.
- System shall support endpoint and model configuration.
- System shall allow model list refresh via Ollama `/api/tags`.

### FR-6: AI Streaming and Stop

- System shall stream AI output incrementally for enabled AI tools.
- System shall provide Stop action for active stream.
- Stop shall cancel in-flight request and show stopped status.

### FR-7: AI Reliability

- System shall enforce timeout for local AI requests.
- System shall support retry attempts before final failure.
- On AI failure, tool shall fallback to deterministic local behavior where designed.

### FR-8: SEO Automation

- System shall generate SEO landing pages programmatically.
- System shall inject social metadata and language alternates.
- System shall refresh sitemap with current URLs.

### FR-9: Build and Distribution

- System shall build source into `dist/` for deployment.
- Build shall include root pages, tool pages, seo pages, and assets.

### FR-10: Testing

- System shall run responsive, QA, and tool-level tests.
- AI workflow tests shall verify:
  - share-link restore
  - send-output flow
  - stop-stream behavior
  - network-failure fallback

---

## 8. Non-Functional Requirements

### NFR-1 Performance

- Primary UI interactions shall remain responsive on modern desktop/mobile browsers.
- Tool actions should provide feedback within 100-300ms for local deterministic flows.

### NFR-2 Availability (Local AI)

- Core tools shall remain usable when local AI is unavailable.
- AI-related failures shall not crash tool page.

### NFR-3 Security and Privacy

- Core processing shall remain client-side.
- Local AI requests shall target configured localhost endpoint only (by default).
- No mandatory cloud data persistence.

### NFR-4 Usability

- UX shall be consistent across tools (status, actions, clear/copy behavior).
- Responsive behavior shall avoid horizontal overflow at key breakpoints.

### NFR-5 Maintainability

- Shared logic shall be centralized in toolkit/provider modules.
- Test coverage shall include key user flows.

### NFR-6 Compatibility

- Support latest Chromium-based browsers and modern standards.

---

## 9. User Personas and Use Cases

### Persona A: Developer

- Needs JSON, regex, JWT, and code explanation quickly.
- Uses send-output flow to chain tools.

### Persona B: SEO/Content User

- Uses SERP, keyword density, plagiarism checks, and prompt tools.
- Uses share-link to collaborate.

### Persona C: Privacy-Conscious User

- Enables local AI with Ollama.
- Avoids cloud API dependencies.

---

## 10. System Constraints

- Frontend-first architecture
- No backend assumptions for primary features
- Optional dependency: local Ollama service

---

## 11. External Interfaces

### 11.1 Browser Interface

- HTML/CSS/JS UI
- Clipboard API usage for copy actions

### 11.2 Local AI API

- Ollama endpoint default: `http://localhost:11434`
- Endpoints used:
  - `GET /api/tags`
  - `POST /api/generate`

### 11.3 Analytics Interface

- Existing gtag script in page head (where configured)

---

## 12. Data Model (High-Level)

- `tools.json`: tool definitions, category, path, flags
- `localStorage` keys:
  - usage and favorites stats
  - density/theme/plan preferences
  - local AI settings
- URL hash payloads:
  - `tb_state`
  - `tb_send`

---

## 13. Error Handling Requirements

- Invalid input: display non-blocking status message
- AI endpoint failure: show fallback message and keep usable output
- Abort/cancel: show explicit stopped message
- Clipboard failure: show copy error status

---

## 14. Acceptance Criteria

1. Build completes successfully.
2. Responsive tests pass for defined viewport set.
3. Tool tests pass for core and AI workflow flows.
4. Share-link restore and send-output flows work on upgraded tools.
5. AI stop action cancels correctly and reports stopped state.
6. SEO generation and sitemap refresh scripts run without errors.

---

## 15. Release and Operations

### 15.1 Pre-Release Checklist

- `npm run build`
- `npm test`
- `npm run seo:generate`
- `npm run seo:boost`
- `npm run sitemap:refresh`

### 15.2 Deployment Artifacts

- `dist/` static output
- `sitemap.xml`, `robots.txt`
- `seo/` generated pages

---

## 16. Future Enhancements

- Global command palette
- Workflow builder UI
- Expanded AI tool coverage with shared streaming controls
- Additional reliability tests for timeout/retry edge cases
- Optional enterprise-mode features (team templates, audit views)

