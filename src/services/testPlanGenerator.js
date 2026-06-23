/**
 * testPlanGenerator.js
 * B.L.A.S.T. Framework — AI Test Plan Engine
 *
 * Persona: Lead Quality Architect
 * Supports: JIRA-issue mode & direct PRD/requirements mode
 * Model: GROQ llama-3.3-70b-versatile (or user-selected valid GROQ model)
 */

const FALLBACK_CHAIN = [
  { id: 'llama-3.3-70b-versatile', maxOut: 2000 },
  { id: 'gemma2-9b-it',            maxOut: 4000 },
  { id: 'llama-3.1-8b-instant',    maxOut: 3500 },
];

class TestPlanGenerator {
  constructor(apiKey, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    // Place preferred model first in chain, then remaining models
    const preferred = FALLBACK_CHAIN.find(m => m.id === model);
    const rest = FALLBACK_CHAIN.filter(m => m.id !== model);
    this.modelChain = preferred ? [preferred, ...rest] : FALLBACK_CHAIN;
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) {
        return { isValid: false, error: `API validation failed: ${response.status}` };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Connection error: ${error.message}` };
    }
  }

  /**
   * Generate enterprise test plan from JIRA issue or PRD input
   * @param {object} input - JIRA issue { key, summary, description, type, priority }
   *                         OR PRD input { productName, requirements, productType, version }
   */
  async generateTestPlan(input) {
    try {
      const prompt = this.buildEnterprisePrompt(input);
      const response = await this.callGroqAPI(prompt);
      if (!response.success) return { success: false, error: response.error };
      const testPlan = this.parseTestPlan(response.content, input);
      return { success: true, testPlan };
    } catch (error) {
      return { success: false, error: `Test plan generation failed: ${error.message}` };
    }
  }

  buildEnterprisePrompt(input) {
    const isJiraMode = !!input.key;
    const productName = isJiraMode ? input.summary : (input.productName || 'Product Under Test');
    const description = isJiraMode
      ? input.description || 'No description provided'
      : input.requirements || 'No requirements provided';
    const productType = input.productType || 'Web Application (SaaS)';
    const issueRef = isJiraMode ? `JIRA Issue: ${input.key}` : 'PRD Input';
    const version = input.version || '1.0';
    const today = new Date().toISOString().split('T')[0];

    // Truncate requirements to ~800 chars to stay within token budget
    const reqTruncated = description.length > 800 ? description.slice(0, 800) + '...' : description;

    return `You are a Lead Quality Architect (20+ yrs, ISTQB Expert). Generate an enterprise test plan as a single valid JSON object — no markdown, no code fences.

PRODUCT: ${productName} | TYPE: ${productType} | VERSION: ${version} | REF: ${issueRef}

REQUIREMENTS:
${reqTruncated}

RULES:
- Return ONLY valid JSON (no markdown, no code fences)
- ALL test cases must be SPECIFIC to "${productName}" with concrete steps
- Security tests: reference OWASP Top 10 2021 (A01-A10)
- Performance tests: include SLA targets and concurrent user numbers
- Generate: 8 positive, 6 negative, 5 edge, 4 security, 4 performance, 3 accessibility test cases
- Each test case needs: id, title, module, priority (P0/P1/P2/P3), testTechnique, preconditions[], steps[], expectedResult, testData

Return this JSON structure (fill ALL fields with product-specific content):

{"metadata":{"productName":"${productName}","productVersion":"${version}","releaseDate":"TBD","testLead":"QA Team","organization":"B.L.A.S.T. Framework","documentVersion":"1.0","createdDate":"${today}","status":"Draft","productType":"${productType}","riskLevel":"High","estimatedEffort":"3-4 weeks","issueReference":"${issueRef}"},"objective":{"purposeStatement":"2-3 sentences specific to ${productName} purpose and target users","targetAudience":{"primary":"primary user type","secondary":"admin/ops","tertiary":"other stakeholder"},"successCriteria":[">=95% test pass rate","0 critical defects at release","P95 response <2s","Zero OWASP Critical/High","WCAG 2.1 AA compliant","UAT sign-off obtained"],"qualityGoals":["Quality goal 1 for ${productName}","Reliability goal","Performance goal"]},"scope":{"inScope":[{"feature":"feature 1","description":"describe it","priority":"P0","testingType":"Functional","riskLevel":"High"},{"feature":"feature 2","description":"describe it","priority":"P1","testingType":"Security","riskLevel":"High"}],"outOfScope":["Third-party service internals","Legacy browser IE","Production database access"],"testingTypes":[{"type":"Functional","include":true,"duration":"4-5 days","priority":"P0","tools":"Playwright"},{"type":"Security","include":true,"duration":"2 days","priority":"P1","tools":"OWASP ZAP"},{"type":"Performance","include":true,"duration":"2 days","priority":"P1","tools":"k6"},{"type":"Accessibility","include":true,"duration":"1 day","priority":"P1","tools":"axe DevTools"}]},"teamRoles":[{"role":"QA Lead","responsibilities":"Test planning, coordination, reporting","allocation":"100%"},{"role":"Test Engineer","responsibilities":"Test execution and automation","allocation":"100%"}],"testEnvironments":{"environments":[{"name":"QA","type":"Staging","url":"https://qa.example.com","infrastructure":"Cloud","database":"PostgreSQL","purpose":"Primary functional testing"},{"name":"Performance","type":"Perf","url":"https://perf.example.com","infrastructure":"Cloud","database":"PostgreSQL","purpose":"Load testing"}],"networkConditions":[{"type":"Broadband","speed":"100Mbps","latency":"<20ms","test":true},{"type":"4G/LTE","speed":"20-50Mbps","latency":"20-50ms","test":true}],"securityRequirements":{"authentication":["OAuth 2.0","MFA"],"dataSecurity":["TLS 1.3","AES-256"],"testDataPolicy":"Anonymised synthetic data only"}},"defectManagement":{"severityLevels":[{"severity":"CRITICAL","definition":"System crash, data loss, security breach","examples":"Login fails all users","impact":"Cannot use product","resolutionSLA":"Same day"},{"severity":"HIGH","definition":"Major feature broken","examples":"Checkout fails silently","impact":"Major functionality lost","resolutionSLA":"2 business days"},{"severity":"MEDIUM","definition":"Feature partially broken, workaround exists","examples":"Slow page load","impact":"Moderate","resolutionSLA":"1 week"},{"severity":"LOW","definition":"Cosmetic defect","examples":"Icon misaligned","impact":"Negligible","resolutionSLA":"Next sprint"}],"priorityLevels":[{"priority":"P0","definition":"Blocks release","fixTimeline":"Same day"},{"priority":"P1","definition":"Critical functionality impacted","fixTimeline":"2 days"},{"priority":"P2","definition":"Significant UX impact","fixTimeline":"1 week"},{"priority":"P3","definition":"Moderate impact","fixTimeline":"2 weeks"}],"trackingTool":"JIRA","escalationPath":[{"priority":"P0","escalateTo":"QA Lead + Dev Lead + PM","timeLimit":"15 minutes"}]},"testStrategy":{"approach":"Risk-based testing prioritising P0/P1 features. Shift-left with automated regression on every PR.","testingTypes":[{"type":"Use Case Testing","description":"Validate primary user journeys","tools":"Playwright","automationLevel":"High"},{"type":"Boundary Value Analysis","description":"Test field limits and numeric boundaries","tools":"Manual + Playwright","automationLevel":"Medium"},{"type":"OWASP Security Testing","description":"Test all OWASP Top 10 2021 categories A01-A10","tools":"OWASP ZAP, Burp Suite","automationLevel":"Medium"},{"type":"Load Testing","description":"Validate performance SLAs under expected and peak load","tools":"k6","automationLevel":"High"},{"type":"Accessibility Testing","description":"WCAG 2.1 AA compliance","tools":"axe DevTools, NVDA","automationLevel":"Medium"}],"phases":[{"phase":"Phase 1: Smoke Testing","duration":"1 day","objective":"Verify build stability","entryCriteria":"Build deployed to QA","exitCriteria":"All P0 paths accessible"},{"phase":"Phase 2: Functional Testing","duration":"4-5 days","objective":"Full feature validation","entryCriteria":"Smoke 100% pass","exitCriteria":">=95% execution, >=95% pass rate"},{"phase":"Phase 3: Integration Testing","duration":"2 days","objective":"E2E workflow validation","entryCriteria":"Functional >80% complete","exitCriteria":"All integration scenarios pass"},{"phase":"Phase 4: Performance Testing","duration":"2 days","objective":"Validate SLAs under load","entryCriteria":"Functional 100% complete","exitCriteria":"P95 <2s at 2x load"},{"phase":"Phase 5: Security Testing","duration":"2 days","objective":"OWASP Top 10 validation","entryCriteria":"Functional >90% complete","exitCriteria":"Zero Critical/High CVEs"},{"phase":"Phase 6: Accessibility Testing","duration":"1 day","objective":"WCAG 2.1 AA compliance","entryCriteria":"Functional complete","exitCriteria":"No critical axe violations"},{"phase":"Phase 7: UAT","duration":"2 days","objective":"Stakeholder sign-off","entryCriteria":"All QA phases complete, no P0/P1 open","exitCriteria":"Sign-off obtained"}],"automationStrategy":{"framework":"Playwright (TypeScript)","cicdIntegration":"GitHub Actions — every PR and daily on main","regressionCoverage":">=80% of P0/P1","reportingTool":"Allure Report + JIRA"}},"schedule":{"totalDuration":"3-4 weeks","milestones":[{"milestone":"Test Plan Approved","week":"Week 1","criteria":"Stakeholders sign off","status":"Pending"},{"milestone":"Test Environment Ready","week":"Week 1","criteria":"QA env configured, data seeded","status":"Pending"},{"milestone":"Smoke Testing Complete","week":"Week 2","criteria":"No P0 blockers","status":"Pending"},{"milestone":"Functional Testing Complete","week":"Week 2-3","criteria":">=95% pass rate","status":"Pending"},{"milestone":"Non-Functional Testing Complete","week":"Week 3","criteria":"SLAs met, no Critical CVEs","status":"Pending"},{"milestone":"UAT Complete","week":"Week 4","criteria":"Business sign-off obtained","status":"Pending"},{"milestone":"Release Decision","week":"Week 4","criteria":"All exit criteria met","status":"Pending"}]},"deliverables":{"documents":["Test Plan (IEEE 829)","Test Cases (JIRA/Zephyr)","Test Execution Reports","Defect Reports","Test Summary Report","UAT Sign-off"],"metrics":{"totalTestCases":30,"automatedPercentage":"70%","defectDetectionEfficiency":"85%","requirementsCoverage":"100%"},"tools":{"management":"JIRA + Zephyr","automation":"Playwright","performance":"k6","security":"OWASP ZAP","accessibility":"axe DevTools","reporting":"Allure Report"}},"entryExitCriteria":{"phases":[{"phase":"functional","entry":["Build deployed and stable","Test data seeded","Test environment verified"],"exit":[">=95% executed",">=95% pass rate","All P0/P1 resolved"]},{"phase":"performance","entry":["Functional 100% complete","Perf env provisioned"],"exit":["P95 <2s at expected load","Stable at 2x concurrent users"]},{"phase":"security","entry":["Functional >90% complete","Security tools configured"],"exit":["Zero Critical/High CVEs","A01-A10 all tested"]},{"phase":"uat","entry":["All QA phases complete","No P0/P1 open defects"],"exit":["Sign-off obtained","UAT report approved"]}]},"tools":{"testManagement":"JIRA + Zephyr Scale","automation":"Playwright (TypeScript)","performance":"k6 + Grafana","security":"OWASP ZAP + Burp Suite","accessibility":"axe DevTools + NVDA + WAVE","reporting":"Allure Report","cicd":"GitHub Actions","monitoring":"Datadog / New Relic"},"risks":[{"id":"R001","description":"Unstable QA environment causing false test failures","probability":"Medium","impact":"High","riskScore":"High","mitigation":"Daily env health checks, containerised test environments","contingency":"Rerun on stable branch, escalate to DevOps","owner":"QA Lead + DevOps"},{"id":"R002","description":"Scope creep adding untested features at release cutoff","probability":"Medium","impact":"High","riskScore":"High","mitigation":"Strict change control, impact assessment for late additions","contingency":"Risk-based subset testing, explicit sign-off for scope changes","owner":"QA Lead + PM"},{"id":"R003","description":"Third-party API failures causing intermittent test failures","probability":"High","impact":"Medium","riskScore":"High","mitigation":"Contract testing, mock servers for external dependencies","contingency":"Graceful degradation testing","owner":"QA Lead + Dev Lead"}],"testCases":{"positiveScenarios":[{"id":"TC-P-001","title":"replace with positive test 1 specific to ${productName}","module":"Core Functionality","priority":"P0","testTechnique":"Use Case Testing","preconditions":["User authenticated","Feature accessible in QA"],"steps":["Step 1","Step 2","Verify result"],"expectedResult":"Expected outcome","testData":"Valid test data"},{"id":"TC-P-002","title":"replace with positive test 2","module":"User Workflow","priority":"P0","testTechnique":"Use Case Testing","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-003","title":"replace","module":"Data Management","priority":"P1","testTechnique":"Decision Table Testing","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-004","title":"replace","module":"Authentication","priority":"P0","testTechnique":"Use Case Testing","preconditions":["Valid credentials"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-005","title":"replace","module":"UI Navigation","priority":"P1","testTechnique":"Exploratory Testing","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-006","title":"replace","module":"Integration","priority":"P1","testTechnique":"Integration Testing","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-007","title":"replace","module":"CRUD Operations","priority":"P0","testTechnique":"State Transition Testing","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"},{"id":"TC-P-008","title":"replace","module":"Search/Filter","priority":"P1","testTechnique":"Equivalence Partitioning","preconditions":["Precondition"],"steps":["Step 1"],"expectedResult":"Result","testData":"Data"}],"negativeScenarios":[{"id":"TC-N-001","title":"replace with negative test 1 for ${productName}","module":"Authentication","priority":"P1","testTechnique":"Equivalence Partitioning","preconditions":["Invalid credential set"],"steps":["Step 1"],"expectedResult":"Access denied, error message shown","testData":"Invalid credentials"},{"id":"TC-N-002","title":"replace","module":"Form Validation","priority":"P1","testTechnique":"Boundary Value Analysis","preconditions":["Form accessible"],"steps":["Step 1"],"expectedResult":"Validation error displayed","testData":"Invalid input"},{"id":"TC-N-003","title":"replace","module":"Authorization","priority":"P0","testTechnique":"Use Case Testing","preconditions":["Non-admin user logged in"],"steps":["Step 1"],"expectedResult":"HTTP 403 Forbidden","testData":"Non-privileged user"},{"id":"TC-N-004","title":"replace","module":"Input Validation","priority":"P1","testTechnique":"Boundary Value Analysis","preconditions":["Input field accessible"],"steps":["Step 1"],"expectedResult":"Input rejected","testData":"5000 char string"},{"id":"TC-N-005","title":"replace","module":"Session Management","priority":"P1","testTechnique":"State Transition Testing","preconditions":["Active session"],"steps":["Step 1"],"expectedResult":"Session expired, redirect to login","testData":"Expired token"},{"id":"TC-N-006","title":"replace","module":"API Error Handling","priority":"P1","testTechnique":"Error Guessing","preconditions":["API accessible"],"steps":["Step 1"],"expectedResult":"Appropriate HTTP error code","testData":"Invalid API request"}],"edgeCases":[{"id":"TC-E-001","title":"replace with edge case 1 for ${productName}","module":"Boundary Conditions","priority":"P1","testTechnique":"Boundary Value Analysis","preconditions":["Field with defined max limit"],"steps":["Enter exactly max-length value","Submit"],"expectedResult":"Accepted without truncation","testData":"String of exact max length"},{"id":"TC-E-002","title":"replace — zero numeric input","module":"Boundary Conditions","priority":"P2","testTechnique":"Boundary Value Analysis","preconditions":["Numeric field accessible"],"steps":["Enter 0","Submit"],"expectedResult":"Processed correctly without error","testData":"0"},{"id":"TC-E-003","title":"replace — special characters and Unicode","module":"Character Encoding","priority":"P1","testTechnique":"Exploratory Testing","preconditions":["Text input accessible"],"steps":["Enter special chars and Unicode","Save and verify"],"expectedResult":"Stored correctly, no XSS","testData":"< > & Unicode emoji"},{"id":"TC-E-004","title":"replace — concurrent access race condition","module":"Concurrency","priority":"P1","testTechnique":"Load Testing","preconditions":["Multiple user sessions"],"steps":["Two users simultaneously update same record"],"expectedResult":"No data corruption","testData":"2 concurrent sessions"},{"id":"TC-E-005","title":"replace — network disruption during critical action","module":"Error Handling","priority":"P1","testTechnique":"Fault Injection","preconditions":["Network can be throttled"],"steps":["Begin action","Cut network","Restore","Verify state"],"expectedResult":"Data not corrupted, meaningful error shown","testData":"Network throttle tool"}],"securityTests":[{"id":"TC-S-001","title":"OWASP A01 - Broken Access Control: Horizontal privilege escalation in ${productName}","module":"Security — Access Control","priority":"P0","testTechnique":"OWASP Testing Guide","preconditions":["Two user accounts with different data","Burp Suite or DevTools"],"steps":["Log in as User A","Note User A resource URL","Switch to User B session","Attempt to access User A resource directly"],"expectedResult":"HTTP 403 Forbidden; access denied logged; User B cannot see User A data","testData":"Two distinct user accounts"},{"id":"TC-S-002","title":"OWASP A03 - Injection: SQL injection probe on search/login fields","module":"Security — Injection","priority":"P0","testTechnique":"OWASP Testing Guide","preconditions":["OWASP ZAP configured as proxy"],"steps":["Configure ZAP proxy","Navigate to input fields","Inject: OR 1=1 and DROP TABLE payloads","Observe responses"],"expectedResult":"Payloads rejected; no DB error leakage; ZAP shows no SQLi findings","testData":"OWASP SQLi payload list"},{"id":"TC-S-003","title":"OWASP A07 - Authentication Failures: Brute force protection","module":"Security — Authentication","priority":"P0","testTechnique":"OWASP Testing Guide","preconditions":["Test account","Rate limiting configured"],"steps":["Attempt 10 failed logins rapidly","Observe lockout behaviour","Verify CAPTCHA or lockout triggered"],"expectedResult":"Account locked or CAPTCHA after 5 failures; HTTP 429 or 423","testData":"Invalid credentials x10"},{"id":"TC-S-004","title":"OWASP A05 - Security Misconfiguration: HTTP security headers present","module":"Security — Configuration","priority":"P1","testTechnique":"OWASP Testing Guide","preconditions":["Browser DevTools or ZAP"],"steps":["Intercept HTTP responses","Check for HSTS, CSP, X-Frame-Options, X-Content-Type-Options headers","Verify no sensitive data in response bodies","Check CORS policy"],"expectedResult":"All security headers present; HSTS enforced; no secrets in responses; CORS restricts to allowed origins","testData":"ZAP passive scan"}],"performanceTests":[{"id":"TC-PERF-001","title":"${productName} page load under 100 concurrent users — P95 SLA","module":"Performance — Load","priority":"P1","testTechnique":"Load Testing","preconditions":["k6 installed","Performance environment provisioned with production-equivalent data"],"steps":["Configure k6: 100 VUs ramping over 2 min","Run 10-minute steady-state test","Capture P50, P95, P99 response times","Monitor error rate and throughput"],"expectedResult":"P95 < 2s; P99 < 4s; error rate < 0.1%","testData":"k6 script: 100 VUs, 10 min"},{"id":"TC-PERF-002","title":"${productName} stress test at 2x expected peak load","module":"Performance — Stress","priority":"P1","testTechnique":"Stress Testing","preconditions":["k6 configured","Performance environment ready"],"steps":["Ramp to 2x expected concurrent users","Hold 5 minutes","Monitor for errors and degradation"],"expectedResult":"Graceful degradation; error rate < 5% at 2x load; recovery within 60s","testData":"k6 script: 2x peak VUs"},{"id":"TC-PERF-003","title":"${productName} database query performance under load","module":"Performance — Database","priority":"P1","testTechnique":"Load Testing","preconditions":["DB slow query log enabled","100k+ records seeded"],"steps":["Run standard load test","Monitor slow query log","Check queries > 100ms","Verify index usage via EXPLAIN ANALYSE"],"expectedResult":"No queries > 200ms at expected load; all critical paths use indexes","testData":"100k records, slow query threshold 100ms"},{"id":"TC-PERF-004","title":"${productName} API P95 response time validation","module":"Performance — API","priority":"P1","testTechnique":"Load Testing","preconditions":["API accessible","k6 available"],"steps":["Send 1000 sequential API requests","Capture P50, P95, P99","Compare against SLA"],"expectedResult":"P95 < 500ms; P99 < 1s; zero 5xx errors","testData":"1000 API requests with valid auth"}],"accessibilityTests":[{"id":"TC-A-001","title":"WCAG 2.1 AA — Keyboard navigation covers all interactive elements in ${productName}","module":"Accessibility — Keyboard","priority":"P1","testTechnique":"Accessibility Testing","preconditions":["Mouse disconnected","Chrome browser"],"steps":["Tab through all interactive elements","Verify visible focus indicator","Verify logical Tab order","Verify Enter/Space activate controls","Verify Esc closes modals"],"expectedResult":"All elements reachable; focus always visible; no keyboard traps; logical order","testData":"Keyboard only — no mouse"},{"id":"TC-A-002","title":"WCAG 2.1 AA — Colour contrast >= 4.5:1 for all body text","module":"Accessibility — Colour","priority":"P1","testTechnique":"Accessibility Testing","preconditions":["WAVE tool available"],"steps":["Run WAVE scan on all pages","Identify text contrast ratios","Flag ratios below 4.5:1"],"expectedResult":"All normal text contrast >= 4.5:1; large text >= 3:1; zero WAVE contrast errors","testData":"WAVE scan across all pages"},{"id":"TC-A-003","title":"WCAG 2.1 SC 1.1.1 — All images have descriptive alt text","module":"Accessibility — Images","priority":"P1","testTechnique":"Accessibility Testing","preconditions":["axe DevTools installed"],"steps":["Run axe DevTools on all pages","Verify meaningful images have descriptive alt","Verify decorative images have empty alt or role=presentation"],"expectedResult":"Zero image-alt axe violations","testData":"axe DevTools scan"}]}}`;

  }

  async callGroqAPI(prompt) {
    const messages = [
      { role: 'system', content: 'You are a senior QA architect generating enterprise test plans. Always return valid JSON only — no markdown, no code fences, no explanatory text.' },
      { role: 'user', content: prompt },
    ];

    for (const model of this.modelChain) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model.id, messages, temperature: 0.3, max_tokens: model.maxOut }),
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 || (response.status === 400 && errText.includes('model_decommissioned'))) {
            continue; // try next model
          }
          return { success: false, error: `GROQ API error ${response.status}: ${errText.substring(0, 300)}` };
        }

        const data = await response.json();
        return { success: true, content: data.choices[0].message.content };
      } catch (error) {
        return { success: false, error: `GROQ API call failed: ${error.message}` };
      }
    }

    return { success: false, error: 'All AI models are rate-limited. Please wait a minute and try again.' };
  }

  parseTestPlan(content, input) {
    try {
      // Strip any accidental markdown code fences
      let cleaned = content.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

      // Extract the outermost JSON object
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found in response');

      const parsed = JSON.parse(cleaned.slice(start, end + 1));

      const isJiraMode = !!input.key;
      const productName = isJiraMode ? input.summary : (input.productName || 'Product Under Test');

      // Normalise shape: support both old and new format
      const tc = parsed.testCases || {};
      const scenarios = {
        positive: tc.positiveScenarios || parsed.positiveScenarios || [],
        negative: tc.negativeScenarios || parsed.negativeScenarios || [],
        edge: tc.edgeCases || parsed.edgeCases || [],
        security: tc.securityTests || parsed.securityTests || [],
        performance: tc.performanceTests || parsed.performanceTests || [],
        accessibility: tc.accessibilityTests || parsed.accessibilityTests || [],
      };

      const total = Object.values(scenarios).reduce((sum, arr) => sum + (arr?.length || 0), 0);

      return {
        issueKey: input.key || 'PRD',
        summary: productName,
        generatedAt: new Date().toISOString(),
        inputMode: isJiraMode ? 'jira' : 'prd',
        productType: input.productType || 'Web Application (SaaS)',
        // All template sections
        metadata: parsed.metadata || {},
        objective: parsed.objective || {},
        scope: parsed.scope || {},
        teamRoles: parsed.teamRoles || [],
        testEnvironments: parsed.testEnvironments || {},
        defectManagement: parsed.defectManagement || {},
        testStrategy: parsed.testStrategy || {},
        schedule: parsed.schedule || {},
        deliverables: parsed.deliverables || {},
        entryExitCriteria: parsed.entryExitCriteria || {},
        tools: parsed.tools || {},
        risks: parsed.risks || [],
        // Test cases (normalised)
        testCases: tc,
        scenarios,
        totalTestCases: total,
      };
    } catch (error) {
      console.error('Parse error, using fallback:', error.message);
      return this.createFallbackPlan(input);
    }
  }

  createFallbackPlan(input) {
    const isJiraMode = !!input.key;
    const productName = isJiraMode ? input.summary : (input.productName || 'Product Under Test');
    const today = new Date().toISOString().split('T')[0];

    return {
      issueKey: input.key || 'PRD',
      summary: productName,
      generatedAt: new Date().toISOString(),
      inputMode: isJiraMode ? 'jira' : 'prd',
      productType: input.productType || 'Web Application (SaaS)',
      metadata: {
        productName,
        productVersion: '1.0',
        releaseDate: 'TBD',
        testLead: 'QA Team',
        organization: 'B.L.A.S.T. Framework',
        documentVersion: '1.0',
        createdDate: today,
        status: 'Draft',
        riskLevel: 'High',
        estimatedEffort: '3–4 weeks',
      },
      objective: {
        purposeStatement: `Comprehensive test strategy for ${productName}. This plan covers functional, integration, performance, security, and accessibility testing to ensure enterprise-grade quality before release.`,
        targetAudience: { primary: 'End users', secondary: 'Support team', tertiary: 'Administrators' },
        successCriteria: ['≥ 95% test case pass rate', '≥ 95% feature coverage', '0 critical defects', '≤ 2 high defects', 'Performance SLA < 2s', 'Zero critical CVEs'],
      },
      scope: {
        inScope: [
          { feature: 'Core Functionality', description: productName, priority: 'P0', testingType: 'Functional', riskLevel: 'High' },
          { feature: 'User Interface', description: 'UI/UX for all user-facing flows', priority: 'P1', testingType: 'Functional', riskLevel: 'Medium' },
          { feature: 'API Layer', description: 'REST API endpoints and responses', priority: 'P0', testingType: 'Integration', riskLevel: 'High' },
          { feature: 'Security Controls', description: 'Authentication, authorisation, data protection', priority: 'P0', testingType: 'Security', riskLevel: 'High' },
          { feature: 'Performance', description: 'Load testing, response times, scalability', priority: 'P1', testingType: 'Performance', riskLevel: 'Medium' },
        ],
        outOfScope: ['Third-party service internals', 'Legacy browser support (IE)', 'Infrastructure configuration'],
        testingTypes: [
          { type: 'Smoke Testing', include: true, duration: '1 day', priority: 'P0', tools: 'Manual' },
          { type: 'Functional Testing', include: true, duration: '4-5 days', priority: 'P0', tools: 'Manual / Playwright' },
          { type: 'Integration Testing', include: true, duration: '2 days', priority: 'P1', tools: 'Postman' },
          { type: 'Performance Testing', include: true, duration: '2 days', priority: 'P1', tools: 'k6 / JMeter' },
          { type: 'Security Testing', include: true, duration: '2 days', priority: 'P1', tools: 'OWASP ZAP' },
          { type: 'Accessibility Testing', include: true, duration: '1 day', priority: 'P1', tools: 'axe DevTools' },
        ],
        environments: [
          { environment: 'Staging/QA', include: true, browsers: 'Chrome, Firefox, Safari', details: 'Primary testing environment' },
          { environment: 'Pre-production', include: true, browsers: 'All supported', details: 'Performance and security' },
        ],
      },
      testEnvironments: {
        operatingSystems: [
          { os: 'Windows 11', version: '23H2', priority: 'High', included: true },
          { os: 'macOS Sonoma', version: '14.x', priority: 'High', included: true },
          { os: 'iOS', version: '17.x', priority: 'High', included: true },
          { os: 'Android', version: '14', priority: 'High', included: true },
        ],
        browsers: [
          { browser: 'Chrome', versions: 'Latest 2 stable', desktop: true, mobile: true, priority: 'High' },
          { browser: 'Firefox', versions: 'Latest 2 stable', desktop: true, mobile: false, priority: 'High' },
          { browser: 'Safari', versions: 'Latest 2 stable', desktop: true, mobile: true, priority: 'High' },
          { browser: 'Microsoft Edge', versions: 'Latest 2 stable', desktop: true, mobile: false, priority: 'Medium' },
        ],
      },
      defectManagement: {
        severityLevels: [
          { severity: 'CRITICAL', definition: 'System broken, data loss, security breach', impact: 'Cannot use product', resolutionSLA: 'Same day' },
          { severity: 'HIGH', definition: 'Major feature broken', impact: 'Major functionality lost', resolutionSLA: '< 2 days' },
          { severity: 'MEDIUM', definition: 'Feature partially broken, workaround exists', impact: 'Moderate impact', resolutionSLA: '< 1 week' },
          { severity: 'LOW', definition: 'Cosmetic issue', impact: 'Minimal', resolutionSLA: 'Next sprint' },
        ],
        priorityLevels: [
          { priority: 'P0 – Blocker', definition: 'Blocks release', fixTimeline: 'Same day' },
          { priority: 'P1 – Critical', definition: 'Fix in current sprint', fixTimeline: '< 2 days' },
          { priority: 'P2 – High', definition: 'Fix soon', fixTimeline: '< 1 week' },
        ],
      },
      testStrategy: {
        approach: 'Risk-based testing with shift-left quality principles.',
        techniques: [
          { name: 'Equivalence Class Partitioning', description: 'Divide inputs into equivalent classes', applicableTo: 'Input validation' },
          { name: 'Boundary Value Analysis', description: 'Test at input boundaries', applicableTo: 'Numeric fields, character limits' },
          { name: 'Use Case Testing', description: 'Test complete user workflows', applicableTo: 'End-to-end flows' },
          { name: 'Exploratory Testing', description: 'Charter-based unscripted testing', applicableTo: 'New features, UX' },
        ],
        phases: [
          { phase: 'Phase 1: Smoke Testing', duration: '1 day', objective: 'Verify build stability', entryCriteria: 'Build deployed', exitCriteria: 'Critical paths accessible' },
          { phase: 'Phase 2: Functional Testing', duration: '4-5 days', objective: 'Full feature validation', entryCriteria: 'Smoke tests passed', exitCriteria: '≥95% pass rate' },
          { phase: 'Phase 3: Integration Testing', duration: '2 days', objective: 'Validate integrations', entryCriteria: 'Functional >80%', exitCriteria: 'All integrations pass' },
          { phase: 'Phase 4: Performance Testing', duration: '2 days', objective: 'Verify SLAs', entryCriteria: 'Functional complete', exitCriteria: 'P95 < 2s' },
          { phase: 'Phase 5: Security Testing', duration: '2 days', objective: 'OWASP validation', entryCriteria: 'Functional >90%', exitCriteria: 'No Critical CVEs' },
          { phase: 'Phase 6: UAT', duration: '2 days', objective: 'Stakeholder sign-off', entryCriteria: 'All QA phases complete', exitCriteria: 'Sign-off obtained' },
        ],
      },
      risks: [
        { id: 'R001', description: 'Unstable test environment', probability: 'Medium', impact: 'High', riskScore: 'High', mitigation: 'Daily environment health checks', owner: 'DevOps Engineer' },
        { id: 'R002', description: 'Late requirement changes', probability: 'Medium', impact: 'High', riskScore: 'High', mitigation: 'Scope freeze policy after sprint planning', owner: 'Product Owner + QA Lead' },
        { id: 'R003', description: 'Third-party API failures', probability: 'High', impact: 'Medium', riskScore: 'High', mitigation: 'Mock servers, contract testing', owner: 'QA Lead' },
      ],
      tools: {
        testManagement: 'JIRA / TestRail',
        automation: 'Playwright (TypeScript)',
        apiTesting: 'Postman / REST Assured',
        performanceTesting: 'k6 / Apache JMeter',
        securityTesting: 'OWASP ZAP / Burp Suite',
        accessibilityTesting: 'axe DevTools / WAVE',
      },
      scenarios: {
        positive: [
          { id: 'TC-P-001', title: 'Successful core feature execution', module: 'Core', priority: 'P0', testTechnique: 'Use Case Testing', preconditions: ['User authenticated'], steps: ['Navigate to feature', 'Enter valid inputs', 'Submit action'], expectedResult: 'Action completes successfully' },
        ],
        negative: [
          { id: 'TC-N-001', title: 'Login rejected with invalid credentials', module: 'Authentication', priority: 'P0', testTechnique: 'Equivalence Class Partitioning', preconditions: ['Login page accessible'], steps: ['Enter wrong password', 'Click Sign In'], expectedResult: 'HTTP 401 — Invalid credentials message shown' },
        ],
        edge: [
          { id: 'TC-E-001', title: 'Text field accepts exactly max character limit', module: 'Boundary', priority: 'P1', testTechnique: 'Boundary Value Analysis', preconditions: ['Field with max length'], steps: ['Enter exactly N characters', 'Submit'], expectedResult: 'Saved without truncation or error' },
        ],
        security: [
          { id: 'TC-S-001', title: 'SQL injection prevention (OWASP A03:2021)', module: 'Security', priority: 'P0', testTechnique: 'Security Testing', preconditions: ['Input field accessible'], steps: ["Enter ' OR '1'='1", 'Submit'], expectedResult: 'Input treated as literal string; no SQL execution' },
        ],
        performance: [
          { id: 'TC-PERF-001', title: 'Page load < 2s under 10 concurrent users', module: 'Performance', priority: 'P1', testTechnique: 'Performance Testing', preconditions: ['k6 configured'], steps: ['Simulate 10 users', 'Measure P95 response time'], expectedResult: 'P95 < 2s; error rate 0%' },
        ],
        accessibility: [
          { id: 'TC-A-001', title: 'Full keyboard navigation without mouse', module: 'Accessibility', priority: 'P1', testTechnique: 'Accessibility Testing', preconditions: ['Mouse disconnected'], steps: ['Tab through all elements', 'Complete workflow keyboard-only'], expectedResult: 'All elements reachable; visible focus indicators present' },
        ],
      },
      totalTestCases: 6,
    };
  }
}

export const VALID_GROQ_MODELS = FALLBACK_CHAIN.map(m => m.id);
export default TestPlanGenerator;
