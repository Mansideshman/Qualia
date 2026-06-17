# Phase 3: Architect - Layer 2 Navigation Logic

## Component Architecture

### Component Hierarchy

```
App (Root)
│
├── ErrorBoundary (Error handling wrapper)
│   │
│   ├── Header
│   │   ├── Logo
│   │   ├── Title
│   │   └── StatusIndicator
│   │
│   ├── MainContainer
│   │   │
│   │   ├── Sidebar (Optional: collapsible)
│   │   │   ├── Navigation Tabs
│   │   │   ├── Settings Toggle
│   │   │   └── Docs Link
│   │   │
│   │   └── ContentArea
│   │       │
│   │       ├── SettingsPanel (Tab 1)
│   │       │   │
│   │       │   ├── JiraConfigForm
│   │       │   │   ├── BaseUrlInput
│   │       │   │   ├── EmailInput
│   │       │   │   ├── TokenInput (masked)
│   │       │   │   └── ValidateButton
│   │       │   │
│   │       │   └── GroqConfigForm
│   │       │       ├── ApiKeyInput (masked)
│   │       │       ├── ModelSelector (locked)
│   │       │       └── ValidateButton
│   │       │
│   │       └── GenerationPanel (Tab 2)
│   │           │
│   │           ├── IssueSection
│   │           │   ├── IssueIdInput
│   │           │   ├── FetchButton
│   │           │   └── IssueSummaryDisplay
│   │           │       ├── IssueKey
│   │           │       ├── Summary
│   │           │       ├── Description (truncated)
│   │           │       ├── Type Badge
│   │           │       └── Priority Badge
│   │           │
│   │           ├── GenerationSection
│   │           │   ├── GenerateButton (enabled if issue fetched)
│   │           │   ├── ProgressIndicator
│   │           │   ├── StreamingPreview
│   │           │   │   └── TestCaseStream (real-time update)
│   │           │   └── GenerationStats
│   │           │       ├── Time elapsed
│   │           │       ├── Tokens used
│   │           │       └── Status message
│   │           │
│   │           └── TestPlanDisplay
│   │               │
│   │               ├── TestCaseSection (5x)
│   │               │   ├── SectionHeader
│   │               │   │   ├── Title
│   │               │   │   └── Count Badge
│   │               │   │
│   │               │   └── TestCaseList
│   │               │       └── TestCaseCard (1..n)
│   │               │           ├── Id/Number
│   │               │           ├── Title
│   │               │           ├── Description
│   │               │           ├── Steps (if applicable)
│   │               │           ├── Expected Result
│   │               │           └── CopyButton
│   │               │
│   │               └── ExportControls
│   │                   ├── UIExportButton (copy to clipboard)
│   │                   ├── MarkdownExportButton (download .md)
│   │                   ├── PdfExportButton (download .pdf)
│   │                   └── ShareButton (optional)
│   │
│   ├── Notifications
│   │   ├── SuccessToast
│   │   ├── ErrorToast
│   │   └── InfoToast
│   │
│   └── Footer
│       ├── BuildInfo
│       ├── Links
│       └── Copyright

```

---

## 📱 User Flow Diagrams

### Flow 1: First-Time Setup

```
┌─ Start App
│
├─ Check localStorage for saved config
│
├─ NO saved config?
│  └─ Yes ──> Show Settings Panel (focused)
│             │
│             ├─ User enters JIRA credentials
│             ├─ User enters GROQ API key
│             ├─ User clicks "Validate All"
│             │
│             ├─ Call connectivity-test endpoints
│             ├─ Both pass?
│             │  ├─ Yes ──> Save to localStorage
│             │  │         Show success toast
│             │  │         Switch to Generation panel
│             │  │
│             │  └─ No ──> Show specific error message
│             │           Highlight failed field
│             │           Allow retry
│             │
│             └─ Continue to Flow 2
│
└─ YES saved config?
   └─ Yes ──> Load config, run quick validation
             If valid ──> Go to Generation panel
             If invalid ──> Show Settings panel with error
```

### Flow 2: Test Plan Generation

```
┌─ User at Generation Panel
│
├─ User enters Issue ID (e.g., "VWO-48")
├─ User clicks "Fetch Issue"
│  │
│  ├─ Disable input, show loading
│  ├─ Call JIRA API: GET /rest/api/3/issue/{id}
│  │
│  ├─ Success?
│  │  ├─ Yes ──> Parse issue data
│  │  │         Display in IssueSummaryDisplay
│  │  │         Enable "Generate Test Plan" button
│  │  │         Update UI state
│  │  │
│  │  └─ No ──> Show error message
│  │           Re-enable input
│  │           Suggest valid issue ID
│  │
│  └─ Enable input again
│
├─ User reviews issue details
│
├─ User clicks "Generate Test Plan"
│  │
│  ├─ Disable button, show progress bar
│  ├─ Show empty test plan sections
│  │
│  ├─ Build system prompt (from behavioral rules)
│  ├─ Build user prompt (from issue data)
│  │
│  ├─ Call GROQ API (streaming)
│  │  POST /openai/v1/chat/completions
│  │  Body: { model, messages, temperature: 0.7, stream: true }
│  │
│  ├─ Stream response chunks
│  │  └─ For each chunk:
│  │     ├─ Accumulate text
│  │     ├─ Update streaming preview in real-time
│  │     ├─ Show character count
│  │     └─ Update elapsed time
│  │
│  ├─ All chunks received?
│  │  └─ Yes ──> Parse complete JSON response
│  │
│  ├─ JSON valid?
│  │  ├─ Yes ──> Parse test cases into 5 sections
│  │  │         Update TestPlanDisplay
│  │  │         Enable Export buttons
│  │  │         Show success toast
│  │  │         Store to localStorage for session
│  │  │
│  │  └─ No ──> Log raw response for debugging
│  │           Show "Parse failed" error
│  │           Offer to view raw response
│  │           Keep section display as is
│  │
│  └─ Re-enable Generate button
│
└─ Go to Flow 3 (Export)
```

### Flow 3: Export Test Plan

```
┌─ User at TestPlanDisplay (with generated test plan)
│
├─ User clicks "Copy to Clipboard" (UI)
│  │
│  ├─ Format test plan sections as formatted text
│  ├─ Copy to clipboard (navigator.clipboard.writeText)
│  ├─ Show "Copied!" toast
│  │
│  └─ User can paste anywhere
│
├─ User clicks "Download Markdown"
│  │
│  ├─ Generate .md file content
│  │  ├─ Header (title, metadata)
│  │  ├─ Issue summary section
│  │  ├─ Test plan sections (5 sections)
│  │  ├─ Each test case as markdown list
│  │  ├─ Footer (generation info, timestamp)
│  │  └─ File name: `test-plan-{issueKey}-{timestamp}.md`
│  │
│  ├─ Create Blob from content
│  ├─ Trigger browser download
│  └─ Show success message
│
├─ User clicks "Download PDF"
│  │
│  ├─ Use html2pdf library
│  ├─ Convert TestPlanDisplay component to PDF
│  │  ├─ Apply PDF styling
│  │  ├─ Add page breaks between sections
│  │  ├─ Add header/footer with page numbers
│  │  ├─ Add table of contents
│  │  └─ File name: `test-plan-{issueKey}-{timestamp}.pdf`
│  │
│  ├─ Trigger browser download
│  └─ Show success message
│
└─ User may generate another test plan (Loop back to Flow 2)
```

### Flow 4: Settings Management (During Generation)

```
┌─ User at Generation Panel
│
├─ User clicks "Settings" (tab or button)
│  │
│  ├─ Switch to Settings Panel
│  ├─ Load current config from localStorage
│  ├─ Display in form fields
│  │
│  ├─ User may:
│  │  ├─ Update any JIRA field
│  │  ├─ Update GROQ API key
│  │  └─ Click "Validate All" to test
│  │
│  ├─ Validation passes?
│  │  ├─ Yes ──> Update localStorage
│  │  │         Show success toast
│  │  │         Can return to Generation
│  │  │
│  │  └─ No ──> Show error, allow retry
│  │
│  └─ User clicks "Back to Generation"
│     └─ Return to Generation Panel with generated test plan intact
│
└─ Continue where user left off
```

---

## 🔄 State Transitions

### Main State Machine

```
                    ┌─────────────────────┐
                    │   INITIAL_LOAD      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Config Saved?       │
                    └──┬──────────────┬───┘
                       │ NO           │ YES
              ┌────────▼────┐    ┌────▼──────┐
              │ SETTINGS    │    │ VALIDATING│
              │ REQUIRED    │    │ CONFIG    │
              └────────┬────┘    └────┬──────┘
                       │             │
                       ├─ Valid?─────┤
                       │             │
                  ┌────▼──────┐  ┌───▼──────┐
                  │ READY_FOR │  │ ERROR_   │
                  │ GENERATION│  │ CONFIG   │
                  └────┬──────┘  └─────┬────┘
                       │              │
                       ├──────┬───────┤
                       │      │       │
                  ┌────▼──────▼─┐    │
                  │ ISSUE_      │    │
                  │ INPUT       │    │
                  └────┬────────┘    │
                       │             │
                  ┌────▼──────┐      │
                  │ FETCHING_  │      │
                  │ ISSUE      │      │
                  └────┬───────┘      │
                       │              │
                       ├─ Valid?──────┤
                       │              │
                  ┌────▼──────┐  ┌───▼──────┐
                  │ ISSUE_    │  │ ERROR_   │
                  │ READY     │  │ ISSUE    │
                  └────┬──────┘  └──────────┘
                       │
                  ┌────▼──────────┐
                  │ GENERATING_   │
                  │ TEST_PLAN     │
                  └────┬──────────┘
                       │
                  ┌────▼────────────┐
                  │ PLAN_GENERATED  │
                  │ (with exports)  │
                  └─────────────────┘
```

---

## 🎨 Component Interfaces (Props & State)

### SettingsPanel
```javascript
// Props
{
  onConfigSaved: (config) => void,
  onValidationStart: () => void,
  onValidationComplete: (isValid: bool, error?: string) => void,
  initialConfig: SettingsConfig
}

// Local State
{
  jiraConfig: { baseUrl, email, token },
  groqConfig: { apiKey },
  validationLoading: boolean,
  validationErrors: { [key]: string }
}
```

### GenerationPanel
```javascript
// Props
{
  config: SettingsConfig,
  onGenerationStart: () => void,
  onGenerationComplete: (testPlan) => void
}

// Local State
{
  issueId: string,
  issue: IssueData | null,
  testPlan: TestPlanData | null,
  loading: boolean,
  error: string | null,
  streamingText: string,
  progress: { elapsed: number, tokens: number }
}
```

### TestPlanDisplay
```javascript
// Props
{
  testPlan: TestPlanData,
  issueKey: string,
  onExportMarkdown: () => void,
  onExportPdf: () => void,
  onCopyToClipboard: () => void
}

// Local State
{
  expandedSections: { [sectionId]: boolean },
  selectedTestCase: TestCase | null
}
```

---

## 🔌 Event Handlers Flow

### Key Event Handlers

```javascript
// Settings Panel
handleJiraBaseUrlChange(value)
  ├─ Validate URL format
  └─ Update state

handleValidateJira()
  ├─ Show loading
  ├─ Call /api/jira/validate endpoint
  └─ Update UI with result

handleValidateGroq()
  ├─ Show loading
  ├─ Call /api/groq/validate endpoint
  └─ Update UI with result

handleSaveSettings()
  ├─ Validate all fields
  ├─ Encrypt sensitive data (optional)
  ├─ Save to localStorage
  └─ Show success toast

// Generation Panel
handleFetchIssue()
  ├─ Validate issue ID
  ├─ Call /api/jira/issue endpoint
  ├─ Parse response
  ├─ Update UI with issue details
  └─ Enable Generate button

handleGenerateTestPlan()
  ├─ Build prompts
  ├─ Call /api/groq/generate endpoint (streaming)
  ├─ Process stream chunks in real-time
  ├─ Parse final response
  ├─ Update test plan display
  └─ Show export options

// Export Handlers
handleExportMarkdown()
  ├─ Format test plan as markdown
  ├─ Create file blob
  ├─ Trigger download
  └─ Show success message

handleExportPdf()
  ├─ Convert component to PDF
  ├─ Apply styling
  ├─ Trigger download
  └─ Show success message

handleCopyToClipboard()
  ├─ Format test plan as text
  ├─ Copy to clipboard
  └─ Show "Copied!" toast
```

---

## 📊 Tab Navigation Model

```
┌─ Tab State (active tab in app state)
│
├─ SETTINGS tab
│  ├─ Content: SettingsPanel component
│  ├─ Show when: First load OR user clicks Settings
│  └─ Actions: Validate & Save
│
├─ GENERATION tab
│  ├─ Content: GenerationPanel + TestPlanDisplay
│  ├─ Show when: Config valid AND user navigates
│  └─ Actions: Fetch issue, Generate, Export
│
└─ Transition rules:
   ├─ Can always go TO SETTINGS
   ├─ Can only go TO GENERATION if config valid
   └─ Keep state when switching tabs
```

---

## 💬 Error Boundary Integration

```
ErrorBoundary
  ├─ Catches runtime errors
  ├─ Displays fallback UI
  ├─ Logs to console (dev) or error tracking (prod)
  │
  └─ Error cases handled:
     ├─ Component render failures
     ├─ API call failures
     ├─ JSON parse errors
     └─ Storage access errors
```

---

## 🎯 Validation Rules

### Issue ID Validation
```
- Must be non-empty
- Must contain at least one uppercase letter or digit
- Maximum 50 characters
- Example valid: "VWO-48", "TEST-1", "PROJ_123"
```

### URL Validation
```
- Must start with https://
- Must be valid domain
- Must end without trailing slash
```

### API Key Validation
```
- JIRA token: minimum 10 characters
- GROQ key: minimum 20 characters (typical format)
```

---

## 📡 Async Loading States

```
Each async operation shows:

Loading:  ⏳ "Fetching issue..."
Success:  ✅ "Issue fetched successfully"
Error:    ❌ "Failed to fetch issue: [error message]"
Complete: Ready for next action

Streaming:
  ├─ ⏳ Start
  ├─ 📝 Progress indicator with character count
  ├─ 🔄 Real-time preview updates
  ├─ ✅ Complete
  └─ 📊 Show token usage stats
```

---

## 🔄 Local Storage Strategy

```
localStorage keys:
├─ config.jira.baseUrl (string)
├─ config.jira.email (string)
├─ config.jira.token (string, encrypted if possible)
├─ config.groq.apiKey (string, encrypted if possible)
├─ lastSession.issueId (string)
├─ lastSession.testPlan (JSON)
├─ lastSession.timestamp (ISO8601)
└─ settings.uiTheme (string: "light" | "dark")

Retention:
├─ Config: Until user deletes
├─ Session data: 7 days or until browser clear
└─ Cleanup: Implement optional "Clear All" in settings
```

---

## 📋 Responsive Design Breakpoints

```
Mobile (<640px):
  ├─ Stack all sections vertically
  ├─ Full-width inputs
  ├─ Hide sidebar (move to hamburger menu)
  └─ Single-column layout

Tablet (640px - 1024px):
  ├─ 2-column layout possible
  ├─ Collapsible sidebar
  └─ Readable text size

Desktop (>1024px):
  ├─ 3-column layout available
  ├─ Sidebar always visible
  ├─ Side-by-side issue + preview
  └─ Export buttons always visible
```
