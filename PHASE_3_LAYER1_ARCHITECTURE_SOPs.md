# Phase 3: Architect - Layer 1 SOPs

## Architecture Overview

This document defines the System Operating Procedures (SOPs) for the JIRA Test Plan Generator application.

---

## 🏗️ System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Settings Panel          │ Generation Panel              │   │
│  │  - JIRA Config           │ - Progress Indicator          │   │
│  │  - GROQ Config           │ - Live Test Plan Preview      │   │
│  │  - Validate Connectivity │ - Export Options              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    ┌─────────────┐            ┌──────────────┐
    │  JIRA API   │            │ GROQ API     │
    │             │            │              │
    │ - Fetch     │            │ - Generate   │
    │   Issue     │            │   Test Plan  │
    │ - Validate  │            │ - Stream     │
    │   Auth      │            │   Response   │
    └──────┬──────┘            └──────┬───────┘
           │                          │
           ▼                          ▼
    ┌────────────────────────────────────────┐
    │  Processing Layer (JavaScript)         │
    │  - Data normalization                  │
    │  - Prompt engineering                  │
    │  - Response parsing                    │
    │  - Export generation                   │
    └────────────────────────────────────────┘
           │
           ▼
    ┌────────────────────────────────────────┐
    │  Output Formats                        │
    │  - React UI (live preview)             │
    │  - Markdown (.md file)                 │
    │  - PDF (formatted document)            │
    └────────────────────────────────────────┘
```

---

## 📊 Data Flow Stages

### Stage 1: Configuration Input
```
User provides:
├── JIRA Configuration
│   ├── Base URL
│   ├── Email
│   └── API Token
├── GROQ Configuration
│   ├── API Key
│   └── Model (locked: openai/gpt-oss-120b)
└── Issue Selection
    └── Issue ID (e.g., VWO-48)
```

### Stage 2: Authentication & Validation
```
System validates:
├── JIRA Connectivity (Phase 2)
├── GROQ Connectivity (Phase 2)
├── Issue Access Permissions
└── API Rate Limits
```

### Stage 3: Issue Fetching
```
Fetch from JIRA API:
├── Issue Key
├── Summary
├── Description
├── Issue Type
├── Priority
├── Labels
└── Custom Fields (if applicable)
```

### Stage 4: Prompt Engineering
```
Normalize issue data into structured prompt:
├── Issue summary & description
├── Context (type, priority)
├── Behavioral rules (9 rules from LLM.md)
├── Output format specification
└── Constraints (rate limits, token budget)
```

### Stage 5: Test Plan Generation
```
Send to GROQ (openai/gpt-oss-120b):
├── Structured prompt with behavioral rules
├── Temperature: 0.7 (balance creativity & consistency)
├── Stream responses for real-time UI feedback
└── Parse structured output into 5 sections
    ├── Positive Scenarios
    ├── Negative Scenarios
    ├── Edge Cases
    ├── Security Tests
    └── Performance Tests
```

### Stage 6: Output Generation
```
Transform parsed result into:
├── React UI Component (live preview)
├── Markdown File (downloadable)
├── PDF File (formatted report)
└── Local Storage (session persistence)
```

---

## 🔀 Core Processing Pipelines

### Pipeline 1: Initialization
```
Start
  ├─ Load saved settings from localStorage
  ├─ Initialize empty state
  ├─ Check if credentials exist
  │  ├─ NO → Show Settings Panel
  │  └─ YES → Run Phase 2 validation
  ├─ Validate JIRA & GROQ connectivity
  └─ Display main interface
```

### Pipeline 2: Issue Fetching
```
User clicks "Fetch Issue"
  ├─ Get issue ID from input
  ├─ Retrieve from JIRA API (with auth)
  ├─ Parse response
  ├─ Validate required fields exist
  ├─ Update UI with issue details
  │  ├─ Summary
  │  ├─ Description
  │  └─ Metadata (type, priority)
  └─ Enable "Generate Test Plan" button
```

### Pipeline 3: Test Plan Generation
```
User clicks "Generate Test Plan"
  ├─ Disable button (prevent duplicate calls)
  ├─ Show loading indicator
  ├─ Build system prompt from behavioral rules
  ├─ Build user prompt from issue data
  ├─ Send to GROQ API (stream enabled)
  ├─ Parse streaming chunks in real-time
  ├─ Update UI preview incrementally
  ├─ Parse final JSON response
  ├─ Validate against output schema
  ├─ Populate 5 sections (positive, negative, edge, security, performance)
  ├─ Show success message
  └─ Enable export buttons
```

### Pipeline 4: Export
```
User chooses export format

UI Export:
  ├─ Display formatted test plan
  └─ Copy to clipboard option

Markdown Export:
  ├─ Serialize test plan to .md format
  ├─ Add metadata (generated timestamp, model info)
  └─ Trigger browser download

PDF Export:
  ├─ Convert UI component to PDF (html2pdf)
  ├─ Add branding & formatting
  ├─ Add table of contents & page numbers
  └─ Trigger browser download
```

---

## 💾 State Management Model

### React State Structure
```javascript
{
  // Configuration State
  config: {
    jira: {
      baseUrl: string,
      email: string,
      token: string (encrypted/masked)
    },
    groq: {
      apiKey: string (encrypted/masked),
      model: "openai/gpt-oss-120b"
    }
  },
  
  // UI State
  ui: {
    activeTab: "settings" | "generation",
    loading: boolean,
    error: string | null,
    successMessage: string | null
  },
  
  // Issue State
  issue: {
    id: string,
    key: string,
    summary: string,
    description: string,
    type: string,
    priority: string,
    fetchedAt: ISO8601
  },
  
  // Test Plan State
  testPlan: {
    issueKey: string,
    positiveScenarios: TestCase[],
    negativeScenarios: TestCase[],
    edgeCases: TestCase[],
    securityTests: TestCase[],
    performanceTests: TestCase[],
    generatedAt: ISO8601,
    generatedBy: "GROQ (openai/gpt-oss-120b)",
    rawResponse: string (for debugging)
  }
}
```

---

## 🔐 Security Architecture

### Credential Management
- **Storage:** localStorage with optional encryption
- **Transmission:** HTTPS only
- **Masking:** Tokens shown as ••••• in UI
- **Validation:** Never log or console.log secrets
- **Rotation:** Provide UI option to update tokens

### API Security
- **Headers:** Include User-Agent, proper Accept headers
- **Rate Limiting:** Implement backoff for GROQ free tier
- **Timeouts:** 30s for JIRA, 60s for GROQ
- **Error Handling:** Never expose tokens in error messages

---

## 🔧 Component Architecture

### Main Components (Layer 2)
```
App
├── SettingsPanel
│   ├── JiraConfig
│   ├── GroqConfig
│   └── ValidateButton
├── GenerationPanel
│   ├── IssueInput
│   ├── FetchButton
│   ├── IssueSummary
│   ├── GenerateButton
│   └── ProgressIndicator
├── TestPlanDisplay
│   ├── TestCaseSection (5x)
│   └── ExportControls
│       ├── UIExport
│       ├── MarkdownExport
│       └── PdfExport
└── ErrorBoundary
```

---

## 📝 Error Handling Strategy

### Error Categories

| Error Type | Cause | User Action | Recovery |
|-----------|-------|------------|----------|
| Authentication | Invalid credentials | Retry with correct credentials | Show settings panel |
| Network | Timeout/connectivity | Check internet | Retry button |
| Rate Limit | Too many GROQ calls | Wait 60 seconds | Auto-retry with backoff |
| Invalid Issue | Issue doesn't exist | Use valid issue ID | Clear and retry |
| Parse Error | Invalid GROQ response | Contact support | Show raw response |
| Permission | Insufficient JIRA access | Check permissions | Show error message |

---

## 📦 Dependencies & Tools

### Frontend (React)
- `react` - UI framework
- `axios` or `fetch` - HTTP client
- `react-markdown` - Markdown rendering
- `html2pdf` - PDF generation
- `dotenv-webpack` - Environment variables

### Processing (JavaScript)
- `json-parse-stream` - Stream JSON parsing
- `ajv` - JSON schema validation
- `marked` - Markdown generation

### Optional
- `crypto-js` - Client-side encryption
- `zustand` or `redux` - State management (if scaling)

---

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| JIRA fetch latency | < 2 seconds |
| GROQ generation | 10-30 seconds (free tier) |
| UI render time | < 100ms |
| Export generation | < 2 seconds |
| Markdown file size | < 50KB |
| PDF file size | < 100KB |

---

## 📋 Validation Checkpoints

### Before Fetching Issue
- ✓ JIRA base URL is valid HTTPS URL
- ✓ Email format is valid
- ✓ API token is not empty (min 10 chars)

### Before Generating Test Plan
- ✓ Issue data retrieved and valid
- ✓ GROQ API key present
- ✓ Model name locked to openai/gpt-oss-120b
- ✓ Behavioral rules all loaded

### Before Exporting
- ✓ Test plan sections all populated
- ✓ Total test cases > 0
- ✓ Each test case has description

---

## 🚀 Deployment Architecture

### Development
- React dev server (localhost:3000)
- `.env` file with local credentials
- No HTTPS requirement

### Production
- React build output deployed to static host
- HTTPS required for all API calls
- Environment variables via build-time injection
- CORS headers validated

---

## 📚 Rollback Strategy

If GROQ API becomes unavailable:
1. Display error message to user
2. Show last cached test plan (if exists)
3. Provide option to copy from localStorage
4. Log error for debugging

---

## 🔄 Version Compatibility

- **JIRA API:** v3 (Cloud)
- **GROQ API:** OpenAI-compatible (v1)
- **React:** 17+ (hooks support)
- **Node.js:** 14+ (LTS)
