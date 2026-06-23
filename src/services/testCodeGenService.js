/**
 * testCodeGenService.js
 * B.L.A.S.T. — Playwright / Cypress / Selenium Code Generator
 *
 * Input: natural language flow OR screenshot → Page Object Model code
 * Output: runnable test files + CI config
 */

const BASE_URL    = 'https://api.groq.com/openai/v1';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const FALLBACK_CHAIN = [
  { id: 'llama-3.3-70b-versatile', maxOut: 6000 },
  { id: 'gemma2-9b-it',            maxOut: 6000 },
  { id: 'llama-3.1-8b-instant',    maxOut: 4000 },
];

/* Output delimiter — avoids JSON-escaping code */
const FILE_DELIMITER = '---FILE:';

/* ── Framework metadata ──────────────────────────────────── */
export const FRAMEWORKS = {
  playwright: {
    id: 'playwright',
    label: 'Playwright',
    icon: '🎭',
    color: '#45ba4b',
    languages: ['TypeScript', 'JavaScript'],
    defaultLang: 'TypeScript',
    configFile: 'playwright.config.ts',
    docs: 'https://playwright.dev',
  },
  cypress: {
    id: 'cypress',
    label: 'Cypress',
    icon: '🌲',
    color: '#04C38E',
    languages: ['JavaScript', 'TypeScript'],
    defaultLang: 'JavaScript',
    configFile: 'cypress.config.js',
    docs: 'https://docs.cypress.io',
  },
  selenium: {
    id: 'selenium',
    label: 'Selenium',
    icon: '⚙️',
    color: '#43B02A',
    languages: ['Python', 'Java'],
    defaultLang: 'Python',
    configFile: 'conftest.py',
    docs: 'https://selenium.dev',
  },
};

function parseRetryAfter(errText) {
  const m = errText.match(/try again in ([\dhms.\s]+?)(?:\.|Please|$)/i);
  if (!m) return null;
  return m[1].trim()
    .replace(/(\d+h)(\d)/g, '$1 $2')
    .replace(/(\d+m)(\d)/g, '$1 $2')
    .replace(/\.\d+s/, 's');
}

/* ── File extension helper ───────────────────────────────── */
function ext(language) {
  const map = { TypeScript: 'ts', JavaScript: 'js', Python: 'py', Java: 'java' };
  return map[language] || 'js';
}

/* ── Detect syntax language for code highlight ───────────── */
function syntaxLang(filename) {
  if (filename.endsWith('.ts'))   return 'typescript';
  if (filename.endsWith('.js'))   return 'javascript';
  if (filename.endsWith('.py'))   return 'python';
  if (filename.endsWith('.java')) return 'java';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.xml'))  return 'xml';
  if (filename.endsWith('.txt') || filename.endsWith('.cfg') || filename.endsWith('.ini')) return 'text';
  return 'text';
}

/* ── Determine file list per framework ───────────────────── */
function getFileList(framework, language, flow) {
  const e = ext(language);
  const slug = flow.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);

  if (framework === 'playwright') {
    return [
      `pages/LoginPage.${e}`,
      `pages/${slug.charAt(0).toUpperCase() + slug.slice(1)}Page.${e}`,
      `tests/${slug}.spec.${e}`,
      `playwright.config.${e}`,
    ];
  }
  if (framework === 'cypress') {
    return [
      `cypress/support/pages/LoginPage.${e}`,
      `cypress/support/pages/${slug.charAt(0).toUpperCase() + slug.slice(1)}Page.${e}`,
      `cypress/e2e/${slug}.cy.${e}`,
      `cypress.config.${e}`,
    ];
  }
  // selenium
  if (language === 'Python') {
    return [
      `pages/login_page.py`,
      `pages/${slug}_page.py`,
      `tests/test_${slug}.py`,
      `conftest.py`,
    ];
  }
  return [
    `src/test/java/pages/LoginPage.java`,
    `src/test/java/pages/${slug.charAt(0).toUpperCase() + slug.slice(1)}Page.java`,
    `src/test/java/tests/${slug.charAt(0).toUpperCase() + slug.slice(1)}Test.java`,
    `pom.xml`,
  ];
}

class TestCodeGenService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /* ── Main: generate from text flow ──────────────────────── */
  async generateFromFlow({ flow, framework, language, appUrl, options }) {
    const fileList = getFileList(framework, language, flow);
    const prompt   = this._buildCodePrompt({ flow, framework, language, appUrl, options, fileList });
    const result   = await this._callGroq(prompt, 6000);
    if (!result.success) return result;

    const files = this._parseFiles(result.content, fileList);
    return { success: true, files, modelUsed: result.modelUsed };
  }

  /* ── Main: generate from screenshot ─────────────────────── */
  async generateFromScreenshot({ base64Image, mimeType, framework, language, appUrl, options }) {
    // Step 1: vision — extract UI elements
    const visionPrompt = `You are a senior QA automation engineer. Analyze this UI screenshot and extract:
1. Page name and purpose
2. All interactive elements (buttons, inputs, forms, links, dropdowns) with their labels/text
3. The likely user flow this page is part of
4. Suggested data-testid attribute names for each element (kebab-case)

Be specific and concise. Format: element name → type → visible text/label → suggested data-testid`;

    const visionResult = await this._callVision(base64Image, mimeType, visionPrompt);
    if (!visionResult.success) return visionResult;

    const uiDescription = visionResult.content;
    const flow = `UI flow derived from screenshot:\n${uiDescription}`;

    const fileList = getFileList(framework, language, 'ui_flow');
    const prompt   = this._buildCodePrompt({ flow, framework, language, appUrl, options, fileList, fromScreenshot: true });
    const result   = await this._callGroq(prompt, 6000);
    if (!result.success) return result;

    const files = this._parseFiles(result.content, fileList);
    return { success: true, files, uiDescription, modelUsed: result.modelUsed };
  }

  /* ── Selector Lab ────────────────────────────────────────── */
  async generateSelectors({ htmlSnippet, elementDescription }) {
    const input = htmlSnippet
      ? `HTML SNIPPET:\n${htmlSnippet.slice(0, 1500)}`
      : `ELEMENT DESCRIPTION: ${elementDescription}`;

    const prompt = `You are an expert test automation engineer specializing in element locators.

${input}

Generate the best element selectors for ALL three frameworks. Prioritize in this order:
1. data-testid attribute (most stable)
2. ARIA role + accessible name
3. CSS selector (class or attribute)
4. XPath (last resort)

Return EXACTLY this format (no other text):

PLAYWRIGHT:
  page.getByTestId('element-id')
  page.getByRole('button', { name: 'Submit' })
  page.locator('.css-selector')
  page.locator('//xpath')

CYPRESS:
  cy.get('[data-testid="element-id"]')
  cy.get('[role="button"]').contains('Submit')
  cy.get('.css-selector')

SELENIUM-PYTHON:
  (By.CSS_SELECTOR, '[data-testid="element-id"]')
  (By.XPATH, "//button[contains(text(),'Submit')]")
  (By.CSS_SELECTOR, '.css-selector')

SELENIUM-JAVA:
  By.cssSelector("[data-testid=\\"element-id\\"]")
  By.xpath("//button[contains(text(),'Submit')]")

RECOMMENDED_TESTID:
  data-testid="element-id"

STABILITY_NOTES:
  Brief note on which selector is most stable and why.`;

    const result = await this._callGroq(prompt, 1500);
    if (!result.success) return result;
    return { success: true, content: result.content, modelUsed: result.modelUsed };
  }

  /* ── Prompt builder ──────────────────────────────────────── */
  _buildCodePrompt({ flow, framework, language, appUrl, options, fileList, fromScreenshot }) {
    const url   = appUrl || 'https://app.example.com';
    const fw    = FRAMEWORKS[framework];
    const isPY  = language === 'Python';

    const frameworkRules = {
      playwright: `- Use Playwright's built-in auto-waiting (no explicit waits needed)
- Use page.locator() with data-testid, getByRole(), getByLabel() — prefer in that order
- Use expect(locator).toBeVisible(), toHaveText(), toHaveValue() for assertions
- Include test.beforeEach() for navigation and test.afterEach() if needed
- Use test.describe() blocks to group related tests
- Fixtures: use test.extend() for shared page objects
- Config: include workers, retries, screenshot on failure, baseURL, HTML reporter`,

      cypress: `- Use cy.get('[data-testid="..."]') as primary selector strategy
- No async/await — use Cypress command chain
- Use cy.intercept() to stub API calls where needed
- Include before() / beforeEach() hooks for login state
- Use cy.session() for auth caching
- Use should() and expect() for assertions
- Config: include baseUrl, specPattern, env vars, video: true`,

      selenium: isPY
        ? `- Use WebDriverWait with expected_conditions (EC) for explicit waits — no time.sleep()
- Locator strategy priority: By.CSS_SELECTOR > By.XPATH > By.ID
- Use Page Object Model with __init__ taking driver
- Include pytest fixtures in conftest.py with scope='function'
- Use @pytest.mark.parametrize for data-driven tests
- Assert with pytest assert statements`
        : `- Use WebDriverWait and ExpectedConditions for explicit waits
- Use Page Factory pattern with @FindBy annotations
- Include JUnit 5 @BeforeEach / @AfterEach
- Use TestNG or JUnit 5 for test runner
- Maven pom.xml with selenium-java, webdrivermanager, junit5 dependencies`,
    };

    const optionsList = [];
    if (options?.hooks)       optionsList.push('beforeEach/afterEach setup and teardown');
    if (options?.dataDriven)  optionsList.push('data-driven tests with multiple input sets');
    if (options?.assertions)  optionsList.push('comprehensive assertions on all state changes');
    if (options?.ciConfig)    optionsList.push('CI-ready config with GitHub Actions example');

    return `You are a Principal SDET. Generate production-ready ${fw.label} (${language}) test automation code using Page Object Model.

APP URL: ${url}
FRAMEWORK: ${fw.label} ${language}
${fromScreenshot ? 'SOURCE: UI extracted from screenshot\n' : ''}
USER FLOW TO AUTOMATE:
${flow}

FRAMEWORK RULES:
${frameworkRules[framework]}

${optionsList.length ? `INCLUDE: ${optionsList.join(', ')}` : ''}

OUTPUT FORMAT — generate each file separated by the exact delimiter below:

${FILE_DELIMITER} ${fileList[0]}---
[full file content]
${fileList.slice(1).map(f => `${FILE_DELIMITER} ${f}---\n[full file content]`).join('\n')}

REQUIREMENTS:
- Use real element names from the flow (not generic elem1, elem2)
- Prefer data-testid selectors (e.g., [data-testid="login-btn"])
- Every test must have at least 2 assertions
- Keep each file under 80 lines — concise and complete
- Do NOT add explanatory prose outside the file delimiters
- Start generating immediately with the first delimiter`;
  }

  /* ── File parser ─────────────────────────────────────────── */
  _parseFiles(content, expectedFiles) {
    const results = [];
    const delimRe = /---FILE:\s*([^\n-]+)---/g;
    const matches = [...content.matchAll(delimRe)];

    for (let i = 0; i < matches.length; i++) {
      const name   = matches[i][1].trim();
      const start  = matches[i].index + matches[i][0].length;
      const end    = i + 1 < matches.length ? matches[i + 1].index : content.length;
      const code   = content.slice(start, end).trim();

      if (code.length > 10) {
        results.push({ name, content: code, lang: syntaxLang(name) });
      }
    }

    // If parsing failed (AI ignored delimiter format), wrap whole response
    if (results.length === 0 && content.trim().length > 50) {
      results.push({
        name: expectedFiles[0] || 'generated-test.ts',
        content: content.trim().replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, ''),
        lang: syntaxLang(expectedFiles[0] || '.ts'),
      });
    }

    return results;
  }

  /* ── GROQ text API call ──────────────────────────────────── */
  async _callGroq(prompt, maxTokens = 5000) {
    let lastRetryAfter = null;
    const rateLimited = [];

    for (const model of FALLBACK_CHAIN) {
      const cap = Math.min(maxTokens, model.maxOut);
      try {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
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
                content: 'You are a Principal SDET generating production-quality test automation code. Output ONLY the requested code files using the exact delimiter format specified. No explanations.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: cap,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) { lastRetryAfter = parseRetryAfter(errText); rateLimited.push(model.id); continue; }
          if (res.status === 413 || (res.status === 400 && errText.includes('model_decommissioned'))) { rateLimited.push(model.id); continue; }
          return { success: false, error: `GROQ API error ${res.status}: ${errText.substring(0, 300)}` };
        }

        const data = await res.json();
        return { success: true, content: data.choices[0].message.content, modelUsed: model.id };
      } catch (err) {
        return { success: false, error: `Network error: ${err.message}` };
      }
    }

    const retryMsg = lastRetryAfter ? ` Retry after: ${lastRetryAfter}.` : '';
    return { success: false, isRateLimit: true, error: `All AI models rate-limited.${retryMsg}` };
  }

  /* ── GROQ vision API call ────────────────────────────────── */
  async _callVision(base64Image, mimeType, prompt) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          }],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Vision API error ${res.status}: ${errText.substring(0, 200)}` };
      }
      const data = await res.json();
      return { success: true, content: data.choices[0].message.content };
    } catch (err) {
      return { success: false, error: `Vision call failed: ${err.message}` };
    }
  }
}

export default TestCodeGenService;
