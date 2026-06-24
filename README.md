# Qualia — AI-Powered QA Platform

**Live:** [qualiaqa.vercel.app](https://qualiaqa.vercel.app) · [blast-framework.vercel.app](https://blast-framework.vercel.app)  
**Stack:** React 18 · GROQ AI (Llama 3.3 70B) · Vision AI · Vercel  
**Framework:** B.L.A.S.T. (Blueprint · Link · Architect · Stylize · Trigger)  
**Last Updated:** June 24, 2026

---

## What is Qualia?

Qualia is a production-deployed, full-stack AI QA platform with **9 intelligent testing tools** — all powered by GROQ's free-tier LLMs with automatic multi-model fallback. It covers the entire QA lifecycle: from requirements to test plans, test cases, automation code, complete frameworks, API contract testing, defect detection via Vision AI, and one-click defect push to 5 bug trackers.

No backend server required. All AI calls run client-side through GROQ's API. Credentials are stored locally in the browser — never sent to any third-party server.

---

## The 9 AI Tools

### 1. QA Buddy — AI QA Mentor
Conversational expert assistant covering Playwright, Cypress, Selenium, REST Assured, k6, OWASP, CI/CD, and QA careers. Powered by **Llama 4 Scout Vision** — accepts file attachments, folder uploads, screenshots, and code files. Answers at any level from beginner to senior SDET.

### 2. Test Intelligence — AI Test Plan Generator
Connects to JIRA Cloud, fetches a ticket by issue key, and generates a full **IEEE 829-compliant test plan** including:
- Positive, Negative, Edge Case scenarios
- Security (OWASP A01–A10)
- Performance (k6 scripts)
- Accessibility (WCAG 2.1 AA)
- Risk matrix, entry/exit criteria, milestones, tool recommendations

Exports to **PDF, DOCX, Markdown, HTML, and JSON**.

### 3. Scenario Forge — AI Test Case Generator
Generates precision test cases from PRDs, user stories, JIRA issues, or screenshots. Outputs 23-field enterprise test cases with technique tagging (BVA, Equivalence Partitioning, State Transition, Error Guessing). Exports to **Excel, JIRA CSV, XRay CSV, Zephyr CSV, YouTrack CSV, JSON, Markdown**.

### 4. Test Blueprint — Multi-Dimension Test Strategy
Generates a complete RICE-POT test strategy document (Risk · Impact · Coverage · Environment · People · Objective · Tools) from PRDs, user stories, or JIRA issues. Exports to **Excel, HTML/PDF, Markdown**.

### 5. Release Confidence — Metrics & Reporting
Calculates 20 QA metrics from 14 raw inputs (test execution data, defect counts by severity). RICE-POT interpretation flags release readiness. Exports to **Markdown, CSV, Excel, HTML/PDF**.

### 6. Defect Radar — Vision AI Bug Detection
Upload screenshots, log files, or text descriptions. **Llama 4 Scout Vision** (with 2 fallback vision models) analyzes the evidence and outputs:
- Bug title, severity classification, root cause
- Reproduction steps, debugging recommendations
- One-click push to bug tracker

### 7. API Contract Forge — OpenAPI → Test Suite
Upload an OpenAPI/Swagger JSON spec. Generates:
- Positive, Negative, Auth, Contract Violation, OWASP security tests
- Postman collection, Newman CLI runner, k6 performance script

### 8. Test Code Generator — Automation Code
Generates runnable test automation code for **Playwright (JS/TS/Python), Cypress, Selenium** from natural language descriptions, user flows, or screenshots. Includes Selector Lab for CSS/XPath generation.

### 9. Framework Forge — Full E2E Framework Generator
Generates a complete, production-ready automation framework (full folder structure, config files, page objects, fixtures, utilities, README, CI/CD pipeline) — not just code snippets, but a deployable project. Download as ZIP.

---

## Cross-Cutting Features

### Multi-Model AI with Intelligent Fallback
All generators run on GROQ's free tier with an automatic fallback chain:

```
Llama 3.3 70B → Llama 3.1 70B → Llama 3.1 8B
```

If a model is rate-limited or decommissioned, the next kicks in instantly. Vision tools have their own chain:

```
Llama 4 Scout 17B Vision → Llama 3.2 90B Vision → Llama 3.2 11B Vision
```

### History — Save, View & Resume Sessions
Every generated document or conversation can be saved to **localStorage-backed history**:
- **Save** any output with one click (`💾 Save`)
- **View** full content in a modal with syntax-highlighted preview
- **Resume** any session — navigates back to the generator and restores all inputs and outputs
- **Search & filter** history by tool type
- **Delete** individual items or clear all
- QA Buddy conversations restore the full message thread exactly where you left off

### Bug Tracker Integration (5 Trackers)
One-click defect push from Defect Radar and Scenario Forge to:

| Tracker | Auth |
|---|---|
| Jira Cloud | Basic (email + API token) |
| Linear | Personal API key |
| GitHub Issues | Personal Access Token |
| YouTrack | Bearer token |
| Azure DevOps | PAT |

All requests are proxied server-side via Vercel API routes to avoid CORS.

### Export Formats
Every tool exports content — collectively supporting: **PDF, DOCX, Markdown, HTML, JSON, Excel (.xlsx), CSV (5 variants), ZIP**.

### PDF/DOCX/Image Attachments
All generators accept drag-and-drop attachments. PDFs and DOCX files are extracted to text. Images are analyzed by Vision AI and described before being fed into test generation.

---

## Architecture

### B.L.A.S.T. Framework
Built using the B.L.A.S.T. methodology — a deterministic, self-healing protocol for AI-assisted development:

```
Protocol 0 — Initialization (LLM.md as project constitution)
Phase 1 — Blueprint  (data schemas, behavioral rules locked)
Phase 2 — Link       (API connectivity verified)
Phase 3 — Architect  (3-layer service architecture)
Phase 4 — Stylize    (React UI, dark mode, responsive)
Phase 5 — Trigger    (Vercel deployment, CI/CD, monitoring)
```

### 3-Layer Service Architecture

```
Layer 1 — Architecture SOPs     (architecture/ — Markdown specs)
Layer 2 — Navigation Logic      (React state, routing, context)
Layer 3 — JavaScript Tools      (src/services/ — atomic, deterministic)
```

### Key Services

| Service | Purpose |
|---|---|
| `jiraClient.js` | JIRA Cloud REST API v3 wrapper |
| `groqClient.js` | GROQ OpenAI-compatible API wrapper |
| `testPlanGenerator.js` | Test plan orchestration + fallback chain |
| `testCaseService.js` | Scenario Forge generation engine |
| `testStrategyService.js` | RICE-POT strategy generator |
| `testMetricsExporter.js` | Metrics calculation + multi-format export |
| `defectRadarService.js` | Vision AI evidence analysis |
| `bugTrackerService.js` | 5-tracker defect push (server-side proxied) |
| `apiContractService.js` | OpenAPI → test suite generator |
| `testCodeGenService.js` | Playwright/Cypress/Selenium code generator |
| `frameworkForgeService.js` | Full framework scaffold generator |
| `exportUtils.js` | PDF, DOCX, Markdown, HTML export utilities |

### React Component Tree

```
App.jsx
├── Layout/
│   ├── Header.jsx          (dark mode toggle)
│   └── Sidebar.jsx         (nav with live history badge)
├── QABuddy/
│   └── QABuddyPanel.jsx    (conversational AI + file attachments)
├── Generation/
│   ├── GenerationPanel.jsx (JIRA → test plan)
│   └── TestPlanDisplay.jsx
├── TestCases/
│   ├── TestCaseGenerator.jsx
│   ├── TestCaseTable.jsx
│   └── CreateDefectModal.jsx
├── TestStrategy/
│   └── TestStrategyGenerator.jsx
├── TestMetrics/
│   └── TestMetricsGenerator.jsx
├── DefectRadar/
│   ├── DefectRadarPanel.jsx
│   └── DefectTicketDisplay.jsx
├── APIContractForge/
│   └── APIContractForgePanel.jsx
├── TestCodeGen/
│   └── TestCodeGenPanel.jsx
├── FrameworkForge/
│   └── FrameworkForgePanel.jsx
├── History/
│   └── HistoryPanel.jsx    (save · view · resume sessions)
├── Settings/
│   └── SettingsPanel.jsx   (GROQ + JIRA + bug tracker config)
├── Toast/
│   └── ToastContainer.jsx
└── context/
    ├── ConfigContext.jsx    (credential management)
    ├── NotificationContext.jsx
    └── HistoryContext.jsx   (localStorage session history)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, CSS Variables (dark mode) |
| AI Models | GROQ (Llama 3.3 70B, Llama 4 Scout Vision) |
| Bug Trackers | Jira, Linear, GitHub Issues, YouTrack, Azure DevOps |
| Exports | xlsx, jsPDF, docx, file-saver |
| Deployment | Vercel (SSR API routes for CORS proxy) |
| Storage | localStorage (history, config, theme) |

---

## Local Development

```bash
# Clone
git clone https://github.com/Mansideshman/Qualia.git
cd Qualia

# Install
npm install

# Configure (copy template and fill in your keys)
cp .env.template .env.local

# Start dev server
npm start
# → http://localhost:3000
```

### Environment Variables

```env
REACT_APP_GROQ_API_KEY=your_groq_api_key
REACT_APP_JIRA_BASE_URL=https://yourorg.atlassian.net
REACT_APP_JIRA_EMAIL=your@email.com
REACT_APP_JIRA_TOKEN=your_jira_api_token
```

All credentials can also be configured in the app's Settings panel and are stored in `localStorage` — no `.env` file required for production use.

---

## Deployment

Live on Vercel at two aliases:
- **[qualiaqa.vercel.app](https://qualiaqa.vercel.app)** — primary
- **[blast-framework.vercel.app](https://blast-framework.vercel.app)** — alias

### Deploy from CLI

```bash
# Preview
vercel

# Production
vercel --prod
```

### Vercel API Routes (CORS Proxy)

| Route | Proxies to |
|---|---|
| `/api/jira` | JIRA Cloud REST API v3 |
| `/api/bugtracker` | Linear / GitHub / YouTrack / Azure DevOps |

---

## Security

- No hardcoded credentials anywhere in the codebase
- API keys stored in browser `localStorage` only — never sent to any server other than the intended API
- Server-side proxy handles all cross-origin bug tracker requests
- Input sanitization on all AI prompts
- HTTPS enforced on Vercel deployment

---

## Documentation Index

| Document | Purpose |
|---|---|
| [B.L.A.S.T.md](./B.L.A.S.T.md) | Framework protocol & principles |
| [LLM.md](./LLM.md) | Project constitution (schemas, rules) |
| [Objective.md](./Objective.md) | Original project objectives |
| [findings.md](./findings.md) | Research, constraints, discoveries |
| [PHASE_3_LAYER1_ARCHITECTURE_SOPs.md](./PHASE_3_LAYER1_ARCHITECTURE_SOPs.md) | System architecture & data flow |
| [PHASE_3_LAYER2_NAVIGATION_LOGIC.md](./PHASE_3_LAYER2_NAVIGATION_LOGIC.md) | Component design & user flows |
| [PHASE_3_LAYER3_TOOLS_GUIDE.md](./PHASE_3_LAYER3_TOOLS_GUIDE.md) | Service implementation guide |
| [PHASE_5_DEPLOYMENT.md](./PHASE_5_DEPLOYMENT.md) | Deployment architecture & ops |
| [MAINTENANCE_RUNBOOK.md](./MAINTENANCE_RUNBOOK.md) | Daily/weekly/quarterly ops |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & fixes |
| [PROJECT_COMPLETE_FINAL_REPORT.md](./PROJECT_COMPLETE_FINAL_REPORT.md) | Final project report |

---

## Project Stats

| Metric | Value |
|---|---|
| AI Tools | 9 |
| Bug Tracker Integrations | 5 |
| Export Formats | 10+ |
| AI Models (with fallback) | 6 |
| React Components | 40+ |
| Service Files | 12 |
| Lines of Code | 5,000+ |
| Build Size | ~57KB gzipped |
| Load Time | < 2.5s |

---

**Built with B.L.A.S.T. Framework · Deployed on Vercel · June 2026**
