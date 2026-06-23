/**
 * frameworkForgeService.js
 * Auto Framework Forge — AI generates a full E2E automation framework.
 *
 * Uses delimiter-based output (---FILE: path---) to avoid JSON-escaping issues.
 * Two sequential GROQ calls: config files first, then source/test files.
 */

const BASE_URL = 'https://api.groq.com/openai/v1';

const FALLBACK_CHAIN = [
  { id: 'llama-3.3-70b-versatile', maxOut: 4500 },
  { id: 'gemma2-9b-it',            maxOut: 4000 },
  { id: 'llama-3.1-8b-instant',    maxOut: 3500 },
];

/* ── Framework metadata exported for UI ─────────────────────── */
export const FRAMEWORK_CONFIGS = {
  'playwright-e2e': {
    id: 'playwright-e2e',
    label: 'Playwright E2E',
    icon: '🎭',
    color: '#45ba4b',
    languages: ['TypeScript', 'JavaScript'],
    defaultLang: 'TypeScript',
  },
  'playwright-api': {
    id: 'playwright-api',
    label: 'Playwright API',
    icon: '🔌',
    color: '#3d8bff',
    languages: ['TypeScript'],
    defaultLang: 'TypeScript',
  },
  'cypress': {
    id: 'cypress',
    label: 'Cypress E2E',
    icon: '🌲',
    color: '#04C38E',
    languages: ['JavaScript', 'TypeScript'],
    defaultLang: 'JavaScript',
  },
  'selenium-basic': {
    id: 'selenium-basic',
    label: 'Selenium Basic POM',
    icon: '⚙️',
    color: '#43B02A',
    languages: ['Java'],
    defaultLang: 'Java',
  },
  'selenium-improved': {
    id: 'selenium-improved',
    label: 'Selenium Improved POM',
    icon: '🔧',
    color: '#2e8a20',
    languages: ['Java'],
    defaultLang: 'Java',
  },
  'selenium-pagefactory': {
    id: 'selenium-pagefactory',
    label: 'Selenium Page Factory',
    icon: '🏭',
    color: '#1a6e12',
    languages: ['Java'],
    defaultLang: 'Java',
  },
  'restassured': {
    id: 'restassured',
    label: 'REST Assured',
    icon: '☕',
    color: '#f97316',
    languages: ['Java'],
    defaultLang: 'Java',
  },
  'webdriverio': {
    id: 'webdriverio',
    label: 'WebdriverIO',
    icon: '🤖',
    color: '#ea5906',
    languages: ['TypeScript', 'JavaScript'],
    defaultLang: 'TypeScript',
  },
};

/* ── File list per framework ─────────────────────────────────── */
function getFileLists(framework, language) {
  const isTS = language === 'TypeScript';
  const e    = isTS ? 'ts' : 'js';

  const lists = {
    'playwright-e2e': {
      config: [
        `playwright.config.${e}`,
        'package.json',
        '.github/workflows/e2e-tests.yml',
      ],
      source: [
        `pages/BasePage.${e}`,
        `pages/LoginPage.${e}`,
        `tests/e2e/login.spec.${e}`,
        'README.md',
      ],
    },
    'playwright-api': {
      config: [
        'playwright.config.ts',
        'package.json',
        '.github/workflows/api-tests.yml',
      ],
      source: [
        'clients/BaseApiClient.ts',
        'clients/UsersApiClient.ts',
        'fixtures/api.fixture.ts',
        'tests/api/users.spec.ts',
      ],
    },
    'cypress': {
      config: [
        `cypress.config.${e}`,
        'package.json',
        '.github/workflows/cypress-tests.yml',
      ],
      source: [
        `cypress/support/pages/LoginPage.${e}`,
        `cypress/support/commands.${e}`,
        `cypress/e2e/login.cy.${e}`,
        'README.md',
      ],
    },
    'selenium-basic': {
      config: [
        'pom.xml',
        'testng.xml',
        'src/main/resources/data.properties',
      ],
      source: [
        'src/main/java/com/automation/driver/DriverManager.java',
        'src/main/java/com/automation/pages/LoginPage.java',
        'src/test/java/com/automation/base/CommonToAllTest.java',
        'src/test/java/com/automation/tests/TestLogin.java',
      ],
    },
    'selenium-improved': {
      config: [
        'pom.xml',
        'testng.xml',
        'src/main/resources/data.properties',
      ],
      source: [
        'src/main/java/com/automation/driver/DriverManager.java',
        'src/main/java/com/automation/base/CommonToAllPage.java',
        'src/main/java/com/automation/pages/LoginPage.java',
        'src/test/java/com/automation/tests/TestLogin.java',
      ],
    },
    'selenium-pagefactory': {
      config: [
        'pom.xml',
        'testng.xml',
        'src/main/resources/data.properties',
      ],
      source: [
        'src/main/java/com/automation/driver/DriverManager.java',
        'src/main/java/com/automation/base/CommonToAllPage.java',
        'src/main/java/com/automation/pages/LoginPage.java',
        'src/test/java/com/automation/tests/TestLogin.java',
      ],
    },
    'restassured': {
      config: [
        'pom.xml',
        'testng.xml',
        'src/main/resources/data.properties',
      ],
      source: [
        'src/main/java/com/automation/endpoints/APIConstants.java',
        'src/main/java/com/automation/modules/PayloadManager.java',
        'src/test/java/com/automation/base/BaseTest.java',
        'src/test/java/com/automation/tests/crud/TestCRUDBooking.java',
      ],
    },
    'webdriverio': {
      config: [
        `wdio.conf.${e}`,
        'package.json',
        '.github/workflows/wdio-tests.yml',
      ],
      source: [
        `test/pageobjects/Page.${e}`,
        `test/pageobjects/Login.page.${e}`,
        `test/specs/login.spec.${e}`,
        'README.md',
      ],
    },
  };

  return lists[framework] || lists['playwright-e2e'];
}

/* ── Framework-specific AI rules injected into prompt ─────── */
function getFrameworkRules(framework, language) {
  const rules = {
    'playwright-e2e': `PLAYWRIGHT E2E RULES:
- BasePage: abstract class with navigate(path), waitForPageLoad(), and protected locator helpers
- Selector priority: getByRole() > getByLabel() > getByPlaceholder() > getByTestId() > locator('[data-testid]')
- Auto-waiting ONLY — NEVER use waitForTimeout(). Use expect() assertions for condition waits
- auth.setup.ts saves storageState to .auth/user.json after first login
- fixtures/index.ts: extend test with loggedInPage fixture using storageState
- playwright.config.ts: fullyParallel:true, retries:2 in CI, 5 browser projects, HTML+JSON reporters
- package.json: scripts for test, test:headed, test:report, install browsers`,

    'playwright-api': `PLAYWRIGHT API RULES:
- BaseApiClient: constructor(request: APIRequestContext), protected get/post/put/delete methods with auto-assertion
- Domain clients extend BaseApiClient and expose typed methods
- models/ folder: TypeScript interfaces for every request and response shape
- api.fixture.ts: test.extend() with typed client fixtures mapped to each domain
- playwright.config.ts: projects array with just the API project (no browser), globalSetup for auth token
- All methods return typed responses using generics`,

    'cypress': `CYPRESS RULES:
- Custom commands: cy.login(), cy.getByTestId(), cy.apiRequest() in cypress/support/commands.js
- Page Objects in cypress/support/pages/ — classes with cy chainable methods
- cy.session() for auth state caching across specs
- cy.intercept() for API stubbing in tests
- cypress/fixtures/ for JSON test data
- cypress.config.js: baseUrl, specPattern, env vars (API_URL, DEFAULT_USER), video:true
- Assertions use .should(), .and() chaining`,

    'selenium-basic': `SELENIUM BASIC POM RULES:
- DriverManager: ThreadLocal<WebDriver> singleton, initDriver(browser), getDriver(), quitDriver()
- Page classes: constructor takes WebDriver, elements as private By locators
- WaitHelpers: waitForVisible(By), waitForClickable(By), waitForText(By, String) using WebDriverWait (15s default)
- NEVER use Thread.sleep() — use WaitHelpers exclusively
- data.properties: base.url, browser, implicit.wait, explicit.wait
- CommonToAllTest: @BeforeTest reads data.properties, @AfterTest quits driver
- TestNG with @Test, @BeforeTest, @AfterTest annotations`,

    'selenium-improved': `SELENIUM IMPROVED POM RULES:
- DriverManager: ThreadLocal<WebDriver> for parallel, supports Chrome/Firefox/Edge from data.properties
- CommonToAllPage: abstract base with getPageTitle(), waitForVisible(), click(), sendKeys(), getText()
- All page classes extend CommonToAllPage
- RetryAnalyzer: implements IRetryAnalyzer, maxCount=2
- ScreenshotListener: implements ITestListener, takes screenshot on onTestFailure to target/screenshots/
- testng.xml: listeners block with RetryListener and ScreenshotListener
- Allure annotations: @Story, @Severity, @Description`,

    'selenium-pagefactory': `SELENIUM PAGE FACTORY RULES:
- @FindBy annotations on all WebElement fields (id, css, xpath, name strategies)
- PageFactory.initElements(new AjaxElementLocatorFactory(driver, 15), this) in constructor
- CommonToAllPage base: initDriver(), common actions (click, type, getText, isDisplayed)
- AjaxElementLocatorFactory for lazy element initialization on dynamic pages
- All pages extend CommonToAllPage
- No Thread.sleep() — use FluentWait or ExpectedConditions in base class`,

    'restassured': `REST ASSURED RULES:
- POJOs use @SerializedName + @Expose from GSON (no Lombok)
- PayloadManager: static createPayload() for valid data, createWithFaker() for dynamic, deserializeResponse(Response, Class<T>)
- BaseTest @BeforeTest: RequestSpecBuilder with setBaseUri, setContentType, addFilter(new AllureRestAssured())
- ResponseSpecBuilder for common assertion patterns
- AssertActions: fluent wrapper over AssertJ assertions on Response object
- ITestContext: used to share bookingId/authToken across @Test(priority=N) integration flow methods
- testng_e2e.xml: separate suite file for the E2E integration flow
- Allure: @Story, @Description, @Severity on every test method`,

    'webdriverio': `WEBDRIVERIO RULES:
- Page base class: open(path) method using browser.url(), wraps $ and $$ selectors
- Login.page.ts extends Page, exposes named element getters and action methods
- wdio.conf.ts: mocha framework, allure reporter, maxInstances:2, bail:0, retries:1
- Prefer [data-testid="..."] selectors, then ARIA roles
- browser.waitUntil() with custom error messages for dynamic waits
- test/data/ JSON files for all test data — no hardcoded values in specs
- TypeScript strict mode, paths alias for clean imports`,
  };

  return rules[framework] || rules['playwright-e2e'];
}

/* ── Language detection for syntax highlighting ──────────── */
export function detectLang(filename) {
  if (!filename) return 'text';
  const n = filename.toLowerCase();
  if (n.endsWith('.ts') || n.endsWith('.tsx')) return 'typescript';
  if (n.endsWith('.js') || n.endsWith('.jsx')) return 'javascript';
  if (n.endsWith('.java'))                      return 'java';
  if (n.endsWith('.py'))                        return 'python';
  if (n.endsWith('.yml') || n.endsWith('.yaml')) return 'yaml';
  if (n.endsWith('.json'))                      return 'json';
  if (n.endsWith('.xml'))                       return 'xml';
  if (n.endsWith('.md'))                        return 'markdown';
  if (n.endsWith('.properties') || n.endsWith('.env')) return 'properties';
  if (n.endsWith('.sh'))                        return 'bash';
  if (n.startsWith('dockerfile'))               return 'dockerfile';
  return 'text';
}

/* ── File icon by extension ──────────────────────────────── */
export function fileIcon(filename) {
  if (!filename) return '📄';
  const n = filename.toLowerCase();
  if (n.endsWith('.ts') || n.endsWith('.tsx')) return '🔵';
  if (n.endsWith('.js') || n.endsWith('.jsx')) return '🟡';
  if (n.endsWith('.java'))                      return '☕';
  if (n.endsWith('.py'))                        return '🐍';
  if (n.endsWith('.json'))                      return '📋';
  if (n.endsWith('.yml') || n.endsWith('.yaml')) return '⚙️';
  if (n.endsWith('.xml'))                       return '📄';
  if (n.endsWith('.md'))                        return '📖';
  if (n.endsWith('.properties'))                return '🔧';
  if (n.startsWith('dockerfile'))               return '🐳';
  if (n.startsWith('.'))                        return '🔒';
  return '📄';
}

/* ── ID generator ────────────────────────────────────────── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ── Build nested tree from flat { path, content } list ─── */
function buildTree(files) {
  const root = [];

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    insertNode(root, parts, file.content, file.path);
  }

  return root;
}

function insertNode(nodes, parts, content, fullPath) {
  if (parts.length === 1) {
    nodes.push({
      id:      genId(),
      type:    'file',
      name:    parts[0],
      path:    fullPath,
      lang:    detectLang(parts[0]),
      content: content || '',
    });
    return;
  }

  const folderName = parts[0];
  let folder = nodes.find(n => n.type === 'folder' && n.name === folderName);

  if (!folder) {
    folder = {
      id:       genId(),
      type:     'folder',
      name:     folderName,
      expanded: true,
      children: [],
    };
    nodes.push(folder);
  }

  insertNode(folder.children, parts.slice(1), content, fullPath);
}

/* ── Parse delimiter-separated AI output ────────────────── */
function parseFiles(content) {
  const results = [];
  const delimRe = /---FILE:\s*([^\n-]+?)---/g;
  const matches = [...content.matchAll(delimRe)];

  for (let i = 0; i < matches.length; i++) {
    const path  = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end   = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const code  = content.slice(start, end).trim()
      .replace(/^```(?:\w+)?\n?/, '')
      .replace(/\n?```$/, '');

    if (code.length > 5) {
      results.push({ path, content: code });
    }
  }

  return results;
}

/* ── Rate-limit retry message parser ────────────────────── */
function parseRetryAfter(errText) {
  const m = errText.match(/try again in ([\dhms.\s]+?)(?:\.|Please|$)/i);
  if (!m) return null;
  return m[1].trim()
    .replace(/(\d+h)(\d)/g, '$1 $2')
    .replace(/(\d+m)(\d)/g, '$1 $2')
    .replace(/\.\d+s/, 's');
}

/* ── Main service class ──────────────────────────────────── */
class FrameworkForgeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Generate full framework in 2 sequential API calls.
   * Returns { success, tree, modelUsed, error }
   * onPhase(n) is called to advance BLAST phases: 0→1→2→3→4
   */
  async generateFramework({ framework, language, projectName, baseUrl, description, options, onPhase }) {
    const fileLists = getFileLists(framework, language);
    const rules     = getFrameworkRules(framework, language);
    const ctx = { framework, language, projectName, baseUrl, description, options, rules };

    onPhase && onPhase(2); // A — config files

    const configResult = await this._callGroq(
      this._buildPrompt(ctx, fileLists.config, 'configuration & CI/CD setup'),
      4500,
    );
    if (!configResult.success) return configResult;

    onPhase && onPhase(3); // S — source files

    // Brief pause to avoid back-to-back token bursts hitting TPM limit
    await new Promise(r => setTimeout(r, 3000));

    const sourceResult = await this._callGroq(
      this._buildPrompt(ctx, fileLists.source, 'page objects, tests & helpers'),
      4500,
    );
    if (!sourceResult.success) return sourceResult;

    onPhase && onPhase(4); // T — assembling

    const allFiles = [
      ...parseFiles(configResult.content),
      ...parseFiles(sourceResult.content),
    ];

    if (allFiles.length === 0) {
      return { success: false, error: 'AI did not return files in expected format. Try again.' };
    }

    const tree = buildTree(allFiles);
    return { success: true, tree, modelUsed: configResult.modelUsed };
  }

  /**
   * Regenerate a single file.
   * Returns { success, content, error }
   */
  async regenerateFile({ filePath, framework, language, projectName, baseUrl, description }) {
    const rules = getFrameworkRules(framework, language);
    const prompt = `You are a Principal SDET. Regenerate this single file for a ${FRAMEWORK_CONFIGS[framework]?.label || framework} (${language}) automation framework.

PROJECT: ${projectName || 'automation-framework'}
BASE URL: ${baseUrl || 'https://app.example.com'}
${description ? `DESCRIPTION: ${description}` : ''}

${rules}

Generate ONLY the file below (no other text):

---FILE: ${filePath}---
[complete file content here]

Requirements:
- Production-quality, runnable code
- Follow all framework rules above
- Keep under 100 lines`;

    const result = await this._callGroq(prompt, 4000);
    if (!result.success) return result;

    const files = parseFiles(result.content);
    if (files.length > 0) {
      return { success: true, content: files[0].content };
    }

    // Fallback: strip markdown fences
    const cleaned = result.content.trim()
      .replace(/^```(?:\w+)?\n?/, '')
      .replace(/\n?```$/, '');
    return { success: true, content: cleaned };
  }

  /* ── Build generation prompt ───────────────────────────── */
  _buildPrompt({ framework, language, projectName, baseUrl, description, options, rules }, fileList, batchLabel) {
    const fwConfig = FRAMEWORK_CONFIGS[framework] || {};
    const optLines = [];
    if (options?.linting)   optLines.push('ESLint/Checkstyle configured');
    if (options?.prettier)  optLines.push('Prettier/EditorConfig configured');
    if (options?.docker)    optLines.push('Dockerfile and docker-compose.yml included');
    if (options?.allure)    optLines.push('Allure reporting configured');

    const fileLines = fileList.map(f => `---FILE: ${f}---\n[content]`).join('\n\n');

    return `You are a Principal SDET. Generate ${batchLabel} for a ${fwConfig.label || framework} (${language}) project.

PROJECT: ${projectName || 'automation-framework'}
URL: ${baseUrl || 'https://app.example.com'}
${description ? `SCOPE: ${description}\n` : ''}${optLines.length ? `EXTRAS: ${optLines.join(', ')}\n` : ''}
${rules}

Generate ONLY these files using EXACT delimiters (no text outside file blocks):
${fileLines}

CRITICAL: Keep each file under 60 lines. Use real code, not placeholders. Start with the first ---FILE: delimiter immediately.`;
  }

  /* ── GROQ API call with fallback chain ─────────────────── */
  async _callGroq(prompt, maxTokens = 6000) {
    let lastRetryAfter = null;

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
                content: 'You are a Principal SDET. Output ONLY the requested code files using the exact ---FILE: path--- delimiter format. Never add prose outside file blocks.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.15,
            max_tokens: cap,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            lastRetryAfter = parseRetryAfter(errText);
            continue;
          }
          if (res.status === 413 || (res.status === 400 && errText.includes('model_decommissioned'))) {
            continue;
          }
          return { success: false, error: `API error ${res.status}: ${errText.slice(0, 250)}` };
        }

        const data = await res.json();
        return { success: true, content: data.choices[0].message.content, modelUsed: model.id };
      } catch (err) {
        return { success: false, error: `Network error: ${err.message}` };
      }
    }

    const retryMsg = lastRetryAfter ? ` Retry after: ${lastRetryAfter}.` : '';
    return {
      success: false,
      isRateLimit: true,
      error: `All AI models rate-limited.${retryMsg} Please wait and try again.`,
    };
  }
}

/* ── Tree utility helpers (exported for panel use) ────────── */
export function findFirstFile(nodes) {
  for (const n of nodes) {
    if (n.type === 'file') return n;
    if (n.type === 'folder' && n.children) {
      const found = findFirstFile(n.children);
      if (found) return found;
    }
  }
  return null;
}

export function findById(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateById(nodes, id, updater) {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...updater(n) };
    if (n.children) return { ...n, children: updateById(n.children, id, updater) };
    return n;
  });
}

export function removeById(nodes, id) {
  return nodes
    .filter(n => n.id !== id)
    .map(n => n.children ? { ...n, children: removeById(n.children, id) } : n);
}

export function addChild(nodes, parentId, newNode) {
  return nodes.map(n => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, expanded: true, children: [...(n.children || []), newNode] };
    }
    if (n.children) return { ...n, children: addChild(n.children, parentId, newNode) };
    return n;
  });
}

export function countFiles(nodes) {
  let count = 0;
  for (const n of nodes) {
    if (n.type === 'file') count++;
    else if (n.children) count += countFiles(n.children);
  }
  return count;
}

export default FrameworkForgeService;
