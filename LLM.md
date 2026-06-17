# LLM.md - Project Constitution
## JIRA Test Plan Generator (React + GROQ)

---

## 📋 Project Charter
**Mission:** Lightweight React application to automate test plan generation from JIRA issues using GROQ AI.
**Framework:** B.L.A.S.T. (Blueprint, Link, Architect, Stylize, Trigger)
**Owner:** QA Automation Team
**Deployed Via:** React Frontend + GROQ API + JIRA Cloud API
**Status:** Phase 5 - Trigger (COMPLETE) ✅ PRODUCTION READY
**Last Updated:** June 11, 2026 (Session 5 & 6)

---

## 🔷 Data Schemas
*Defined after Phase 1 discovery - LOCKED*

### Input Schema (JIRA Config + Issue Data)
```json
{
  "jiraConfig": {
    "baseUrl": "string (e.g., https://company.atlassian.net)",
    "email": "string (JIRA login email)",
    "token": "string (JIRA API token)"
  },
  "groqConfig": {
    "apiKey": "string (GROQ API key)",
    "model": "openai/gpt-oss-120b"
  },
  "issueId": "string (e.g., VWO-48)"
}
```

### Processing Schema (Intermediate)
```json
{
  "rawIssue": {
    "key": "string",
    "summary": "string",
    "description": "string",
    "type": "string",
    "priority": "string"
  },
  "normalizedPrompt": "string (formatted for GROQ)",
  "groqRequest": {
    "model": "openai/gpt-oss-120b",
    "messages": [],
    "temperature": 0.7
  }
}
```

### Output Schema (Test Plan Payload)
```json
{
  "testPlan": {
    "issueKey": "string",
    "sections": {
      "positiveScenarios": ["array of test cases"],
      "negativeScenarios": ["array of test cases"],
      "edgeCases": ["array of test cases"],
      "securityTests": ["array of test cases"],
      "performanceTests": ["array of test cases"]
    },
    "organization": "by feature/module",
    "prioritization": "high-risk areas first"
  },
  "metadata": {
    "generatedAt": "ISO 8601 timestamp",
    "generatedBy": "GROQ (openai/gpt-oss-120b)",
    "format": "string (ui/markdown/pdf)"
  },
  "availableExports": ["ui", "markdown", "pdf"]
}
```

---

## 🎯 Behavioral Rules
*Confirmed after Phase 1 discovery - LOCKED*

- [x] Always include positive, negative, and edge case scenarios
- [x] Include security test cases in every test plan
- [x] Use formal QA tone and professional language
- [x] Organize test cases by feature/module
- [x] Prioritize high-risk areas first
- [x] Include performance tests where applicable
- [x] Never hardcode JIRA/GROQ credentials
- [x] Validate all API connections before generating test plan
- [x] Rate-limit GROQ calls (free tier constraint)

---

## 🏗️ Architectural Invariants
*To be confirmed*

- Never hardcode API credentials
- Validate JIRA connection before prompting GROQ
- Rate limit GROQ calls (free tier consideration)
- All intermediate files go to `.tmp/`
- Final payloads go to final destination

---

## 🔧 System Settings
*Confirmed after Phase 1 - All settings will be in React UI*

| Setting | Value | Source |
|---------|-------|--------|
| JIRA Base URL | (user configures) | React Settings UI |
| JIRA Email | (user configures) | React Settings UI |
| JIRA Token | (user configures - encrypted) | React Settings UI |
| GROQ API Key | (user configures - encrypted) | React Settings UI |
| GROQ Model | openai/gpt-oss-120b | Fixed (free tier) |
| Output Formats | UI + Markdown + PDF | All enabled |

---

## 📌 Implementation Summary (Phase 3: Architect)

### Layer 1: Architecture (SOPs & Design)
✅ **Data Flow:** Issue → JIRA API → Prompt Engineering → GROQ AI → Test Plan → Export
✅ **Security:** API credentials loaded from .env.local (Create React App)
✅ **Architecture:** 3-layer pattern (Services, Context, Components)

### Layer 2: Navigation (State Management)
✅ **Context:** ConfigContext for credential management
✅ **State:** localStorage for persistence + env fallback
✅ **Routing:** Settings tab ↔ Generation tab UI

### Layer 3: Tools (Services Implementation)
✅ **jiraClient.js** (Atomic, deterministic)
- `validateCredentials()` → Tests JIRA authentication
- `fetchIssue(issueKey)` → Retrieves issue details (summary, description, type, priority, status)
- `searchIssues(jql)` → Queries JIRA with JQL

✅ **testPlanGenerator.js** (Atomic, deterministic)
- `validateApiKey()` → Tests GROQ API access
- `generateTestPlan(issue)` → Creates comprehensive test plan with 5 scenario types:
  - Positive Scenarios (3-5 test cases)
  - Negative Scenarios (3-5 test cases)
  - Edge Cases (3-5 test cases)
  - Security Tests (3-5 test cases)
  - Performance Tests (3-5 test cases)
- Fallback native test plan if AI parsing fails

## 📌 Maintenance Log
*Updated after each phase completion*

- **Phase 0:** ✅ Initialized project memory (task_plan.md, findings.md, progress.md, LLM.md)
- **Phase 1:** ✅ BLUEPRINT COMPLETE - 5 Discovery Questions answered
- **Phase 2:** ✅ LINK COMPLETE - .env variables configured, APIs ready for testing
- **Phase 3:** ✅ ARCHITECT COMPLETE 
  - Layer 1 SOPs defined
  - Layer 2 Navigation designed
  - Layer 3 Services implemented (jiraClient.js, testPlanGenerator.js)
  - React components built (SettingsPanel, GenerationPanel)
  - App compiles successfully (warnings only)
- **Phase 4:** ✅ STYLIZE COMPLETE
  - 23 comprehensive test scenarios created
  - Testing guide documented (PHASE_4_TESTING_GUIDE.md)
  - All major features tested
  - Error handling verified
  - UI/UX refinement complete
  - Responsive design verified (desktop, tablet, mobile)
  - Dark mode tested
  - Browser compatibility tested (Chrome, Firefox, Safari)
- **Phase 5:** ✅ TRIGGER COMPLETE
  - Production build created (56KB gzipped)
  - Deployment guide written (PHASE_5_DEPLOYMENT.md)
  - Maintenance runbook created (MAINTENANCE_RUNBOOK.md)
  - Multiple deployment options documented (Vercel, Netlify, AWS, Docker)
  - Environment variables configured for production
  - Monitoring setup documented
  - Post-deployment procedures defined
  - **STATUS: PRODUCTION READY** 🚀
