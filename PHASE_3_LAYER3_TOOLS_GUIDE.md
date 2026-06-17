# Phase 3: Architect - Implementation Guide

## Complete Phase 3 Overview

Phase 3 consists of 3 architectural layers, each documented separately:

| Layer | Purpose | File |
|-------|---------|------|
| **Layer 1** | Architecture SOPs & Data Flow | `PHASE_3_LAYER1_ARCHITECTURE_SOPs.md` |
| **Layer 2** | Navigation Logic & User Flows | `PHASE_3_LAYER2_NAVIGATION_LOGIC.md` |
| **Layer 3** | JavaScript Tools & Implementation | `PHASE_3_LAYER3_TOOLS/` (this folder) |

---

## Layer 3: Tools Implementation

### File Structure

```
src/
├── services/
│   ├── jiraClient.js           # JIRA API wrapper
│   ├── groqClient.js           # GROQ API wrapper
│   ├── testPlanGenerator.js    # Main generation logic
│   ├── exportUtils.js          # Export utilities (MD, PDF)
│   └── README.md               # This guide
│
├── components/
│   ├── SettingsPanel.jsx
│   ├── GenerationPanel.jsx
│   ├── TestPlanDisplay.jsx
│   └── ...
│
└── utils/
    ├── validators.js
    ├── formatters.js
    └── constants.js
```

---

## Service Layer Documentation

### 1. jiraClient.js

**Purpose:** Handle all JIRA API interactions

**Main Methods:**

```javascript
// Constructor
new JiraClient({
  baseUrl: "https://company.atlassian.net",
  email: "user@company.com",
  token: "jira_api_token"
})

// Validate connection
await jiraClient.validateConnection()
// Returns: { success: boolean, message?: string, error?: string }

// Fetch issue
const issue = await jiraClient.getIssue("VWO-48")
// Returns issue object with normalized fields
```

**Features:**
- ✅ Basic Auth with credentials
- ✅ Automatic retry with exponential backoff
- ✅ Custom error handling
- ✅ Field normalization
- ✅ Custom fields extraction

**Error Handling:**
- 401: Auth error - check credentials
- 403: Permission error - verify access
- 404: Issue not found - check issue key

---

### 2. groqClient.js

**Purpose:** Handle GROQ API interactions with streaming

**Main Methods:**

```javascript
// Constructor
new GroqClient({
  apiKey: "groq_api_key",
  model: "openai/gpt-oss-120b"
})

// Validate connection
await groqClient.validateConnection()
// Returns: { success: boolean, message?: string, error?: string }

// Generate with streaming (recommended)
const response = await groqClient.generateTestPlan(
  systemPrompt,
  userPrompt,
  (chunk, accumulated) => {
    console.log(`Received: ${chunk}`);
    console.log(`Total so far: ${accumulated.length} chars`);
  }
)

// Direct call (non-streaming)
const result = await groqClient.generateTestPlanDirect(
  systemPrompt,
  userPrompt
)
// Returns: { content, usage, model }
```

**Features:**
- ✅ Streaming support for real-time updates
- ✅ Rate limiting for free tier (1s between calls)
- ✅ 60-second timeout for long requests
- ✅ Bearer token authentication
- ✅ Custom error handling

**Rate Limiting:**
- Free tier: 1000 requests/month
- Recommended delay: 1 second between calls
- Automatic backoff implemented

---

### 3. testPlanGenerator.js

**Purpose:** Main orchestration of JIRA + GROQ + parsing

**Main Methods:**

```javascript
// Constructor
const generator = new TestPlanGenerator(jiraClient, groqClient)

// Generate complete test plan
const testPlan = await generator.generateTestPlan(
  issue,
  (progress) => {
    console.log(`Stage: ${progress.stage}`);
    console.log(`Chars: ${progress.charsReceived}`);
  }
)

// Parse GROQ response
const parsed = generator.parseTestPlanResponse(responseText)

// Count test cases
const count = generator.countTestCases(testPlan)

// Format for display
const formatted = generator.formatForDisplay(testPlan)
```

**Behavioral Rules (Enforced):**
1. Always include positive, negative, and edge case scenarios
2. Include security test cases in every test plan
3. Use formal QA tone and professional language
4. Organize test cases by feature/module
5. Prioritize high-risk areas first
6. Include performance tests where applicable

**Output Structure:**
```json
{
  "issueKey": "VWO-48",
  "testPlan": {
    "positiveScenarios": [...],
    "negativeScenarios": [...],
    "edgeCases": [...],
    "securityTests": [...],
    "performanceTests": [...]
  },
  "metadata": {
    "totalTestCases": 25,
    "riskAreas": [...],
    "assumptions": [...]
  }
}
```

---

### 4. exportUtils.js

**Purpose:** Export test plans to different formats

**Main Methods:**

```javascript
// Generate Markdown
const markdown = ExportUtils.generateMarkdown(testPlan, issueData)

// Generate HTML (for PDF)
const html = ExportUtils.generateHtml(testPlan, issueData)

// Download file
ExportUtils.downloadFile(content, "filename.md", "text/markdown")

// Copy to clipboard
const success = await ExportUtils.copyToClipboard(text)

// Count test cases
const count = ExportUtils.countTestCases(testPlan)
```

**Export Formats:**
- ✅ Markdown (.md) - for documentation
- ✅ PDF - for printing/sharing (requires html2pdf)
- ✅ UI Display - live preview in React
- ✅ Clipboard - copy formatted text

---

## Integration Example

### Complete Workflow

```javascript
import { JiraClient } from './services/jiraClient';
import { GroqClient } from './services/groqClient';
import { TestPlanGenerator } from './services/testPlanGenerator';
import { ExportUtils } from './services/exportUtils';

// 1. Initialize clients
const jiraClient = new JiraClient({
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
});

const groqClient = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
  model: 'openai/gpt-oss-120b',
});

const generator = new TestPlanGenerator(jiraClient, groqClient);

// 2. Validate connections
const jiraValid = await jiraClient.validateConnection();
const groqValid = await groqClient.validateConnection();

if (!jiraValid.success || !groqValid.success) {
  console.error('Connection validation failed');
  return;
}

// 3. Fetch issue
const issue = await jiraClient.getIssue('VWO-48');

// 4. Generate test plan
const testPlan = await generator.generateTestPlan(issue, (progress) => {
  console.log(`Progress: ${progress.stage} - ${progress.charsReceived} chars`);
});

// 5. Export options
const markdown = ExportUtils.generateMarkdown(testPlan, issue);
ExportUtils.downloadFile(markdown, `test-plan-${issue.key}.md`, 'text/markdown');

// Or copy to clipboard
await ExportUtils.copyToClipboard(markdown);
```

---

## React Component Integration

### Using in SettingsPanel

```jsx
import { JiraClient } from '../services/jiraClient';

export function SettingsPanel() {
  const [jiraConfig, setJiraConfig] = useState({ baseUrl: '', email: '', token: '' });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);

    try {
      const client = new JiraClient(jiraConfig);
      const result = await client.validateConnection();

      if (result.success) {
        // Save to localStorage
        localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig));
        alert('JIRA connection verified!');
      } else {
        setError(result.error);
      }
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <input value={jiraConfig.baseUrl} onChange={(e) => setJiraConfig({...jiraConfig, baseUrl: e.target.value})} />
      <input value={jiraConfig.email} onChange={(e) => setJiraConfig({...jiraConfig, email: e.target.value})} />
      <input value={jiraConfig.token} onChange={(e) => setJiraConfig({...jiraConfig, token: e.target.value})} />
      <button onClick={handleValidate} disabled={validating}>
        {validating ? 'Validating...' : 'Validate'}
      </button>
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
}
```

### Using in GenerationPanel

```jsx
import { TestPlanGenerator } from '../services/testPlanGenerator';

export function GenerationPanel() {
  const [issueId, setIssueId] = useState('');
  const [issue, setIssue] = useState(null);
  const [testPlan, setTestPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress('Generating test plan...');

    try {
      const generator = new TestPlanGenerator(jiraClient, groqClient);
      const plan = await generator.generateTestPlan(issue, (p) => {
        setProgress(`${p.stage}: ${p.charsReceived || p.totalCases} items`);
      });
      setTestPlan(plan);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <input value={issueId} placeholder="Issue ID (e.g., VWO-48)" onChange={(e) => setIssueId(e.target.value)} />
      <button onClick={() => fetchIssue(issueId)}>Fetch Issue</button>
      {issue && <div>{issue.summary}</div>}
      <button onClick={handleGenerate} disabled={!issue || generating}>
        {generating ? progress : 'Generate Test Plan'}
      </button>
      {testPlan && <TestPlanDisplay testPlan={testPlan} />}
    </div>
  );
}
```

---

## Environment Variables

Create `.env` file:

```
REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net
REACT_APP_JIRA_EMAIL=your-email@company.com
REACT_APP_JIRA_API_TOKEN=your_jira_api_token

REACT_APP_GROQ_API_KEY=your_groq_api_key
REACT_APP_GROQ_MODEL=openai/gpt-oss-120b
```

---

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "html2pdf.js": "^0.10.1"
  },
  "devDependencies": {
    "dotenv": "^16.0.0"
  }
}
```

Install with:
```bash
npm install html2pdf.js dotenv
```

---

## Error Handling Best Practices

### Try-Catch Pattern

```javascript
try {
  const issue = await jiraClient.getIssue(issueId);
} catch (error) {
  if (error.code === 404) {
    showError('Issue not found. Check the issue key.');
  } else if (error.code === 403) {
    showError('You do not have permission to view this issue.');
  } else if (error.code === 401) {
    showError('Authentication failed. Check your credentials.');
  } else {
    showError(`Error: ${error.message}`);
  }
}
```

### Validation Pattern

```javascript
function validateConfig(config) {
  const errors = {};

  if (!config.baseUrl) errors.baseUrl = 'Base URL is required';
  if (!config.baseUrl.startsWith('https://')) errors.baseUrl = 'Must be HTTPS';
  if (!config.email) errors.email = 'Email is required';
  if (!config.token || config.token.length < 10) errors.token = 'Invalid token';

  return Object.keys(errors).length === 0 ? null : errors;
}
```

---

## Testing the Services

### Unit Test Example

```javascript
import { TestPlanGenerator } from '../services/testPlanGenerator';

describe('TestPlanGenerator', () => {
  let generator;
  let mockJiraClient;
  let mockGroqClient;

  beforeEach(() => {
    mockJiraClient = {
      getIssue: jest.fn(),
    };
    mockGroqClient = {
      generateTestPlan: jest.fn(),
    };
    generator = new TestPlanGenerator(mockJiraClient, mockGroqClient);
  });

  test('should validate test plan structure', () => {
    const validPlan = {
      issueKey: 'VWO-48',
      testPlan: {
        positiveScenarios: [{ id: 'TC-001', title: 'Test', description: 'Desc', expectedResult: 'Pass' }],
        negativeScenarios: [],
        edgeCases: [],
        securityTests: [],
        performanceTests: [],
      },
      metadata: {},
    };

    expect(() => generator.validateTestPlanStructure(validPlan)).not.toThrow();
  });
});
```

---

## Next Steps (Phase 4: Stylize)

Once Layer 3 tools are implemented:

1. **Build React Components**
   - Create UI components using Layer 2 navigation logic
   - Integrate with Layer 3 services

2. **Professional Styling**
   - Apply CSS/Tailwind
   - Responsive design
   - Dark mode support

3. **Testing & QA**
   - Component testing
   - Integration testing
   - Manual QA

4. **Performance Optimization**
   - Code splitting
   - Lazy loading
   - Caching strategies

---

## Quick Reference

### API Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 401 | Auth failed | Check credentials |
| 403 | Forbidden | Check permissions |
| 404 | Not found | Check resource key |
| 429 | Rate limit | Wait and retry |
| 500 | Server error | Contact support |

### File Sizes (Target)

- jiraClient.js: ~8 KB
- groqClient.js: ~6 KB
- testPlanGenerator.js: ~12 KB
- exportUtils.js: ~15 KB

---

## Support

For issues or questions:
1. Check error messages in console
2. Review PHASE_2_LINK.md for connectivity testing
3. Review PHASE_3_LAYER1_ARCHITECTURE_SOPs.md for architecture
4. Review PHASE_3_LAYER2_NAVIGATION_LOGIC.md for UI flows
