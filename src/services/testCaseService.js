/**
 * testCaseService.js
 * B.L.A.S.T. Framework — AI Test Case Engine
 *
 * Generates enterprise-grade test cases per testcases_template.md schema.
 * Supports JIRA-issue mode and PRD/requirements mode.
 * Output is tool-agnostic; exporters handle per-tool formatting.
 */

const VALID_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/* Ordered fallback chain — confirmed-active GROQ production models only.
 * maxOut = safe output-token ceiling that stays within each model's TPM limit
 * (TPM = input + output; prompt ~700 tokens; leave headroom)
 *   llama-3.3-70b-versatile : 12 000 TPM → up to 7 000 output
 *   llama-3.1-8b-instant    :  6 000 TPM → up to 4 500 output  (6000-700 prompt ≈ 5300, stay safe)
 *   gemma2-9b-it            : 15 000 TPM → up to 7 000 output
 */
const FALLBACK_CHAIN = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B (Versatile)', maxOut: 7000 },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',                 maxOut: 7000 },
  { id: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B (Instant)',    maxOut: 4500 },
];

/* Extract "2h 11m 27s" from GROQ 429 error messages */
function parseRetryAfter(errText) {
  const m = errText.match(/try again in ([\dhms.\s]+?)(?:\.|Please|$)/i);
  if (!m) return null;
  const raw = m[1].trim();
  // normalise: "2h11m27.455999999s" → "2h 11m 27s"
  return raw.replace(/(\d+h)(\d)/g, '$1 $2').replace(/(\d+m)(\d)/g, '$1 $2').replace(/\.\d+s/, 's');
}

export const TEST_TYPES = [
  { id: 'functional',   label: 'Functional',   icon: '✅', color: '#22c55e' },
  { id: 'negative',     label: 'Negative',     icon: '❌', color: '#ef4444' },
  { id: 'boundary',     label: 'Boundary',     icon: '📐', color: '#f59e0b' },
  { id: 'integration',  label: 'Integration',  icon: '🔗', color: '#6366f1' },
  { id: 'security',     label: 'Security',     icon: '🔒', color: '#8b5cf6' },
  { id: 'performance',  label: 'Performance',  icon: '⚡', color: '#3b82f6' },
  { id: 'accessibility',label: 'Accessibility',icon: '♿', color: '#06b6d4' },
  { id: 'regression',   label: 'Regression',   icon: '🔄', color: '#64748b' },
  { id: 'smoke',        label: 'Smoke',        icon: '💨', color: '#f97316' },
  { id: 'uat',          label: 'UAT',          icon: '👤', color: '#ec4899' },
  { id: 'exploratory',  label: 'Exploratory',  icon: '🔭', color: '#0ea5e9' },
];

export const TOOL_CONFIGS = {
  jira: {
    id: 'jira',
    label: 'JIRA',
    icon: '🔷',
    desc: 'Native JIRA CSV import',
    formats: ['csv', 'json'],
  },
  xray: {
    id: 'xray',
    label: 'XRay for JIRA',
    icon: '🧪',
    desc: 'XRay Test issue CSV import',
    formats: ['csv', 'json'],
  },
  zephyr: {
    id: 'zephyr',
    label: 'Zephyr Scale',
    icon: '♦️',
    desc: 'Zephyr Scale CSV import',
    formats: ['csv', 'json'],
  },
  youtrack: {
    id: 'youtrack',
    label: 'YouTrack',
    icon: '🔶',
    desc: 'JetBrains YouTrack import',
    formats: ['csv', 'json'],
  },
  generic: {
    id: 'generic',
    label: 'Generic (All 23 fields)',
    icon: '📋',
    desc: 'Universal CSV with full field dictionary',
    formats: ['csv', 'json', 'markdown'],
  },
};

export const TC_COUNT_OPTIONS = [5, 10, 15, 20, 30];

class TestCaseService {
  constructor(apiKey, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = VALID_GROQ_MODELS.includes(model) ? model : 'llama-3.3-70b-versatile';
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }

  async analyzeScreenshot(base64Image, mimeType = 'image/png') {
    const prompt = `You are a senior QA engineer. Analyze this UI screenshot and extract all testable requirements.

Describe:
1. Every visible UI element (buttons, forms, inputs, tables, navigation, icons, labels)
2. Possible user interactions and workflows
3. Visible data fields and their expected formats/constraints
4. Any visible states, validations, error messages, or conditions
5. Page/screen purpose and business functionality

Write a clear, structured requirements description suitable for generating comprehensive test cases. Be specific and thorough.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64Image}` },
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Vision API error ${response.status}: ${errText.substring(0, 300)}` };
      }

      const data = await response.json();
      const description = data.choices[0].message.content;
      return { success: true, description };
    } catch (err) {
      return { success: false, error: `Screenshot analysis failed: ${err.message}` };
    }
  }

  async generateTestCases(input) {
    const {
      productName = 'Product Under Test',
      module = 'Core Functionality',
      requirements = '',
      testTypes = ['functional', 'negative', 'boundary'],
      count = 10,
      jiraKey = '',
      linkedStoryKey = '',
      sprint = '',
      assignee = '',
      environment = 'QA',
    } = input;

    const prompt = this.buildPrompt({
      productName, module, requirements, testTypes, count,
      jiraKey, linkedStoryKey, sprint, assignee, environment,
    });

    const result = await this.callGroqAPI(prompt, count);
    if (!result.success) return result;

    try {
      const parsed = this.parseResponse(result.content, input);
      return {
        success: true,
        testCases: parsed,
        modelUsed: result.modelUsed,
        wasFallback: result.wasFallback,
      };
    } catch (err) {
      return { success: false, error: `Parse error: ${err.message}` };
    }
  }

  buildPrompt({ productName, module, requirements, testTypes, count, jiraKey, linkedStoryKey, sprint, environment }) {
    const today = new Date().toISOString().split('T')[0];
    const ref = jiraKey ? `JIRA Issue: ${jiraKey}` : 'PRD';
    // Cap requirements to keep prompt lean
    const truncReq = requirements.length > 700 ? requirements.slice(0, 700) + '...' : requirements;
    const typeList = testTypes.join(', ');
    const modSlug = module.toUpperCase().replace(/\s+/g, '-').slice(0, 8);

    return `You are a 20-year senior QA architect applying the B.L.A.S.T. framework to generate enterprise-grade test cases.
Return ONLY a valid JSON array — no markdown, no code fences, no text before or after the array.

=== B — BLUEPRINT (scope) ===
PRODUCT: ${productName} | MODULE: ${module} | REF: ${ref} | ENV: ${environment}
LINKED: ${linkedStoryKey || jiraKey || 'PROJ-001'} | SPRINT: ${sprint || 'Sprint 1'}
REQUIREMENTS: ${truncReq}

=== L — LINK (coverage target) ===
Generate exactly ${count} test cases covering ALL of these types: ${typeList}.
Distribute evenly across types. Every type must appear at least once.

=== A — ARCHITECT (3-layer test design) ===
Layer 1 (Happy Path): Functional flows that PASS under normal conditions.
Layer 2 (Negative/Boundary): Invalid input, edge values, unauthorized access, empty states.
Layer 3 (Non-Functional): Security (cite OWASP A01-A10), Performance (include SLA ms/rpm targets), Accessibility (cite WCAG 2.1 AA).

=== S — STYLIZE (output format) ===
Follow the 23-field enterprise template exactly. Keep each field SHORT (1-2 sentences; steps max 4 numbered lines).
Test Case ID convention: TC-${modSlug}-001, TC-${modSlug}-002, ...

=== T — TRIGGER (JSON schema) ===
{"testCaseId":"TC-${modSlug}-001","linkedStoryKey":"${linkedStoryKey || jiraKey || 'PROJ-001'}","summary":"one-line objective","testType":"Functional|Negative|Boundary|Integration|Security|Performance|Accessibility|Regression|Smoke|UAT|Exploratory","executionType":"Manual|Automated","priority":"Critical|High|Medium|Low","severity":"Critical|Major|Minor|Trivial","component":"${module}","labels":"tag1,tag2","preconditions":"brief setup","testSteps":"1. Action\\n2. Action\\n3. Verify","testData":"specific inputs","expectedResult":"concrete expected outcome","actualResult":"","status":"Not Executed","assignee":"","reporter":"QA Team","sprint":"${sprint || 'Sprint 1'}","testEnvironment":"${environment}","createdDate":"${today}","executedDate":"","defectId":"","comments":"OWASP ref or automation framework note"}

Return the JSON array of ${count} test cases now:`;
  }

  /* Try each model in FALLBACK_CHAIN until one succeeds.
     Returns { success, content, modelUsed } or { success:false, error, retryAfter } */
  async callGroqAPI(prompt, count = 10) {
    // Base token need; capped per-model below
    const baseTokens = count * 220 + 500;

    // Build the attempt list: preferred model first, then rest of chain
    const preferred = FALLBACK_CHAIN.find(m => m.id === this.model) || FALLBACK_CHAIN[0];
    const rest = FALLBACK_CHAIN.filter(m => m.id !== preferred.id);
    const attempts = [preferred, ...rest];

    let lastRetryAfter = null;
    const rateLimitedModels = [];

    for (const model of attempts) {
      try {
        const maxTokens = Math.min(baseTokens, model.maxOut || 7000);
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              {
                role: 'system',
                content: 'You are a senior QA engineer. Return ONLY valid JSON arrays of test cases — no markdown, no code fences, no explanatory text.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.35,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();

          // Rate limit / daily quota — try next model
          if (response.status === 429) {
            lastRetryAfter = parseRetryAfter(errText);
            rateLimitedModels.push(model.label);
            continue;
          }

          // Request too large for this model's TPM — try next model
          if (response.status === 413) {
            rateLimitedModels.push(`${model.label} (request too large)`);
            continue;
          }

          // Decommissioned model — skip silently to next
          if (response.status === 400 && errText.includes('model_decommissioned')) {
            rateLimitedModels.push(`${model.label} (decommissioned)`);
            continue;
          }

          // Any other error (auth, bad request, etc.) — stop immediately
          return {
            success: false,
            error: `GROQ API error ${response.status}: ${errText.substring(0, 300)}`,
          };
        }

        const data = await response.json();
        return {
          success: true,
          content: data.choices[0].message.content,
          modelUsed: model.label,
          wasFallback: model.id !== this.model,
        };
      } catch (err) {
        return { success: false, error: `Network error: ${err.message}` };
      }
    }

    // All models rate-limited
    const retryMsg = lastRetryAfter ? ` Retry after: ${lastRetryAfter}.` : '';
    return {
      success: false,
      isRateLimit: true,
      retryAfter: lastRetryAfter,
      error: `All AI models have reached their daily quota.${retryMsg} Models tried: ${rateLimitedModels.join(', ')}.`,
    };
  }

  /**
   * Attempt to recover a valid JSON array from a truncated AI response.
   * Finds the last complete object }, trims any trailing comma, and closes the array.
   */
  repairTruncatedJSON(text) {
    const arrayStart = text.indexOf('[');
    if (arrayStart === -1) throw new Error('No JSON array found in response');

    let fragment = text.slice(arrayStart);
    // Walk backwards from the end to find the last closing brace of a complete object
    const lastBrace = fragment.lastIndexOf('}');
    if (lastBrace === -1) throw new Error('No complete test case object found');

    // Slice to include the last complete } then close the array
    fragment = fragment.slice(0, lastBrace + 1).trimEnd();
    // Remove trailing comma if present
    if (fragment.endsWith(',')) {
      fragment = fragment.slice(0, -1);
    }
    fragment += ']';

    return JSON.parse(fragment);
  }

  parseResponse(content, originalInput) {
    let cleaned = content.trim();
    // Strip markdown fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    // Find JSON array boundaries
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      cleaned = cleaned.slice(arrayStart, arrayEnd + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_) {
      // Response was likely truncated — attempt repair using the raw content
      parsed = this.repairTruncatedJSON(content);
    }

    if (!Array.isArray(parsed)) throw new Error('Response is not an array');

    const today = new Date().toISOString().split('T')[0];

    // Normalise and fill defaults
    return parsed.map((tc, i) => ({
      testCaseId: tc.testCaseId || `TC-${String(i + 1).padStart(3, '0')}`,
      linkedStoryKey: tc.linkedStoryKey || originalInput.linkedStoryKey || originalInput.jiraKey || '',
      summary: tc.summary || tc.title || `Test Case ${i + 1}`,
      testType: tc.testType || 'Functional',
      executionType: tc.executionType || 'Manual',
      priority: tc.priority || 'Medium',
      severity: tc.severity || 'Minor',
      component: tc.component || originalInput.module || 'General',
      labels: tc.labels || '',
      preconditions: tc.preconditions || '',
      testSteps: tc.testSteps || tc.steps || '',
      testData: tc.testData || '',
      expectedResult: tc.expectedResult || '',
      actualResult: tc.actualResult || '',
      status: tc.status || 'Not Executed',
      assignee: tc.assignee || originalInput.assignee || '',
      reporter: tc.reporter || 'QA Team',
      sprint: tc.sprint || originalInput.sprint || '',
      testEnvironment: tc.testEnvironment || originalInput.environment || 'QA',
      createdDate: tc.createdDate || today,
      executedDate: tc.executedDate || '',
      defectId: tc.defectId || '',
      comments: tc.comments || '',
    }));
  }
}

export default TestCaseService;
