# Findings & Discoveries

## Initial Context
- **Framework:** B.L.A.S.T. (Blueprint, Link, Architect, Stylize, Trigger)
- **Project:** JIRA Test Plan Generator
- **Tech Stack:** React (frontend)
- **AI Model:** GROQ (openai/gpt-oss-120b - FREE)
- **Primary Integration:** JIRA API (fetch VWO-48 issue)

## Key Constraints Identified
- Using GROQ free tier (not OpenAI GPT-4)
- JIRA authentication required (email + token)
- Need to configure both JIRA and GROQ in settings

## Dependencies
- React framework
- JIRA API client
- GROQ API client
- Configuration management (.env or settings UI)

## Phase 1 Discovery Answers

### 1️⃣ North Star (Desired Outcome)
**Goal:** Create a lightweight React application that automatically generates test plans by:
- Taking JIRA configuration (email, token, base URL)
- Taking GROQ API credentials
- Fetching JIRA issue (VWO-48)
- Generating structured test plan via GROQ (openai/gpt-oss-120b - FREE)

### 2️⃣ Integrations
**Services:** JIRA API + GROQ API
**Status:** Credentials ready (user will configure in settings)

### 3️⃣ Source of Truth
**Data Source:** JIRA Cloud (Atlassian hosted)
**Primary Issue:** VWO-48

### 4️⃣ Delivery Payload
**Output Formats:** Multiple (Markdown + PDF + React UI Display)
- UI Display: Real-time preview in React
- Markdown: Downloadable .md file
- PDF: Professional formatted document

### 5️⃣ Behavioral Rules
**Test Plan Generation Rules:**
- Always include positive, negative, and edge case scenarios
- Include security test cases
- Use formal QA tone
- Organize by feature/module
- Prioritize high-risk areas
- Include performance tests
