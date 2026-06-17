/**
 * testStrategyGenerator.js
 * B.L.A.S.T. Framework — AI Test Strategy Engine
 *
 * Generates enterprise-grade test strategy documents aligned to Test_Strategy_Template.md
 * Covers all 9 sections: Objectives, Scope, Risks, Criteria, Environment,
 * People, Tools & Techniques, Schedule, Deliverables
 */

const VALID_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

class TestStrategyGenerator {
  constructor(apiKey, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = VALID_GROQ_MODELS.includes(model) ? model : 'llama-3.3-70b-versatile';
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }

  async generateTestStrategy(input) {
    try {
      const prompt = this.buildStrategyPrompt(input);
      const response = await this.callGroqAPI(prompt);
      if (!response.success) return { success: false, error: response.error };
      const strategy = this.parseStrategy(response.content, input);
      return { success: true, strategy };
    } catch (error) {
      return { success: false, error: `Test strategy generation failed: ${error.message}` };
    }
  }

  buildStrategyPrompt(input) {
    const productName = input.productName || 'Product Under Test';
    const productType = input.productType || 'Web Application (SaaS)';
    const version = input.version || '1.0';
    const today = new Date().toISOString().split('T')[0];
    const reqTruncated = (input.requirements || '').length > 900
      ? input.requirements.slice(0, 900) + '...'
      : (input.requirements || 'No requirements provided');

    return `You are a Senior QA Test Architect (20+ years, ISTQB Expert Level). Generate a complete enterprise test strategy document as a single valid JSON object — no markdown, no code fences.

PRODUCT: ${productName} | TYPE: ${productType} | VERSION: ${version} | DATE: ${today}

REQUIREMENTS / PRD:
${reqTruncated}

RULES:
- Return ONLY valid JSON (no markdown, no code fences, no prose before or after)
- ALL content must be SPECIFIC to "${productName}" — no generic placeholders
- Reference OWASP Top 10 2021 (A01-A10) for security testing
- Include realistic SLA targets (P95 < 2s), team sizes, and timelines
- Follow IEEE 829 / ISO/IEC 29119 test strategy structure

Return this exact JSON structure (fill ALL fields with product-specific content):

{
  "metadata": {
    "documentStatus": "Draft",
    "preparedBy": "QA Team",
    "role": "Senior QA Test Architect",
    "date": "${today}",
    "productName": "${productName}",
    "productVersion": "${version}",
    "productType": "${productType}",
    "businessObjective": "specific business goal this release supports for ${productName}",
    "projectTimeline": "Month Year – Month Year",
    "sprintCadence": "2-week sprints",
    "teamComposition": "N QA Engineers, N Automation Engineers for N months",
    "usabilityPanelSize": "8 participants",
    "automationTooling": ["Playwright", "REST Assured"],
    "loadPerfTooling": ["k6", "Grafana"],
    "securityStandards": ["OWASP Top 10 2021", "GDPR"],
    "browsersDevices": ["Chrome Latest", "Firefox Latest", "Safari Latest", "Edge Latest", "iOS 17", "Android 14"],
    "thirdPartyServices": ["list services specific to ${productName}"]
  },
  "objectives": {
    "primaryObjective": "Validate that ${productName} meets [specific business goal] with no critical defects impacting core workflows at release.",
    "qualityGoals": {
      "criticalHighDefects": "Zero Critical/High severity defects open at release sign-off",
      "defectLeakage": "< 5% defect leakage to production (target threshold)",
      "testCoverage": ">= 95% test coverage of all in-scope workflows"
    },
    "successMetrics": [
      "All Entry/Exit criteria satisfied for every test phase",
      "Traceability matrix shows 100% coverage of in-scope requirements",
      "UAT sign-off obtained from business stakeholder",
      "specific metric 4 for ${productName}",
      "specific metric 5"
    ]
  },
  "scope": {
    "inScopeWorkflows": ["specific workflow 1 for ${productName}", "specific workflow 2", "specific workflow 3", "specific workflow 4", "specific workflow 5"],
    "inScopeModules": ["Core Feature Module", "Authentication & Authorisation", "API Layer / Integration", "UI / Frontend", "Data Management", "Notifications & Alerts"],
    "outOfScope": ["Third-party service internals", "Legacy browser support (IE11)", "Production database direct access", "Infrastructure provisioning", "specific out of scope item for ${productName}"],
    "testLevels": [
      { "level": "Unit Testing", "owner": "Dev / QA", "coverageTarget": ">= 80% code coverage for critical modules", "tooling": "Jest / JUnit / pytest" },
      { "level": "Integration Testing", "owner": "QA", "coverageTarget": "All exposed APIs and service interfaces", "tooling": "Postman / REST Assured" },
      { "level": "System Testing", "owner": "QA", "coverageTarget": "100% of in-scope workflows end-to-end", "tooling": "Manual + Playwright" },
      { "level": "Security Testing", "owner": "Security / QA", "coverageTarget": "OWASP Top 10 2021 (A01–A10)", "tooling": "OWASP ZAP + Burp Suite" },
      { "level": "Performance Testing", "owner": "Performance Engineer", "coverageTarget": "P95 < 2s at expected and 2x peak load", "tooling": "k6 + Grafana" },
      { "level": "Functional Testing", "owner": "QA", "coverageTarget": "All in-scope functional requirements", "tooling": "Manual + Playwright" },
      { "level": "Regression Testing", "owner": "QA", "coverageTarget": "Automated suite >= 80% P0/P1 coverage, full run pre-release", "tooling": "Playwright + GitHub Actions" },
      { "level": "Smoke Testing", "owner": "QA", "coverageTarget": "Critical path only, every build", "tooling": "Playwright (CI gate)" },
      { "level": "Usability Testing", "owner": "UX / QA", "coverageTarget": "8 participant moderated panel", "tooling": "Moderated sessions / UserTesting" },
      { "level": "Compatibility Testing", "owner": "QA", "coverageTarget": "Chrome, Firefox, Safari, Edge — Desktop + Mobile", "tooling": "BrowserStack / Sauce Labs" }
    ]
  },
  "risks": [
    { "risk": "Test environment instability causing false test failures for ${productName}", "likelihood": "Medium", "impact": "High", "mitigation": "Provision environments 2 sprints ahead; daily environment health checks; containerised test environments", "owner": "DevOps Lead" },
    { "risk": "Third-party service or sandbox access constraints blocking integration tests", "likelihood": "Medium", "impact": "High", "mitigation": "Request all sandbox access at project kickoff; maintain mock/stub fallback for all external dependencies", "owner": "Integration Owner / QA Lead" },
    { "risk": "Workflow complexity exceeds test estimation leading to schedule overrun", "likelihood": "Medium", "impact": "Medium", "mitigation": "Time-box exploratory spikes to 1 day; re-baseline estimate after spike; risk-based prioritisation", "owner": "Test Lead" },
    { "risk": "Resource availability — testers or automation engineers become unavailable", "likelihood": "Low", "impact": "High", "mitigation": "Cross-train all team members on critical test areas; maintain backup resource list", "owner": "QA Manager" },
    { "risk": "Schedule compression near release forcing skip of non-functional testing", "likelihood": "Medium", "impact": "High", "mitigation": "Enforce Entry/Exit criteria; require signed waiver for any phase skip; risk-based test prioritisation", "owner": "Project Manager + QA Lead" },
    { "risk": "specific risk 6 relevant to ${productName}", "likelihood": "Medium", "impact": "High", "mitigation": "specific mitigation", "owner": "specific owner" }
  ],
  "criteria": {
    "phases": [
      { "phase": "Unit", "entryCriteria": "Code complete for module; unit test framework configured; PR review approved", "exitCriteria": ">= 80% code coverage met; no open Critical defects in module" },
      { "phase": "Integration", "entryCriteria": "Unit exit met; test environment stable; API contracts and test data available", "exitCriteria": "All interface and data validations pass; all defects triaged; no Critical open" },
      { "phase": "System", "entryCriteria": "Integration exit met; full test data set loaded; environment stable for 24h", "exitCriteria": "100% of in-scope workflows executed; Critical/High defects = 0; >= 95% pass rate" },
      { "phase": "Security", "entryCriteria": "System exit met; security tooling (ZAP, Burp) configured and validated", "exitCriteria": "No Critical/High vulnerabilities open; OWASP A01–A10 checklist signed off" },
      { "phase": "Performance", "entryCriteria": "System exit met; performance environment provisioned with production-scale data", "exitCriteria": "P95 < 2s at expected load; stable at 2x peak concurrent users; error rate < 0.1%" },
      { "phase": "UAT", "entryCriteria": "All QA phases complete; no P0/P1 open defects; RC build deployed to UAT environment", "exitCriteria": "Business stakeholder sign-off document obtained; UAT report approved" }
    ],
    "suspensionCriteria": "Testing is suspended if a Critical/Blocker defect prevents continued execution of a core workflow, or if the test environment is unavailable for more than 4 consecutive hours. Suspension is declared by the Test Lead and communicated to the Project Manager within 30 minutes.",
    "resumptionCriteria": "Testing resumes once the blocking defect is fixed and re-verified by QA, or environment availability is restored and confirmed stable by the Test Lead. A re-entry smoke run must pass before full testing resumes."
  },
  "environment": {
    "environments": [
      { "name": "Dev", "purpose": "Unit testing and early integration testing by developers", "dataStrategy": "Synthetic data only — no real user data", "notes": "Refreshed on every sprint start" },
      { "name": "QA", "purpose": "Functional, Integration, and System testing", "dataStrategy": "Masked production data or synthetic dataset", "notes": "Refresh cadence: weekly; environment owner: QA Lead" },
      { "name": "Staging", "purpose": "Pre-release validation and performance/security testing", "dataStrategy": "Production-like volume with fully masked PII", "notes": "Mirrors production config; locked 48h before UAT" },
      { "name": "UAT", "purpose": "Business stakeholder validation and acceptance", "dataStrategy": "Masked production data — approved by Data Protection Officer", "notes": "Locked during UAT window; changes require CAB approval" },
      { "name": "Performance", "purpose": "Load, stress, soak, and spike testing", "dataStrategy": "Production-scale synthetic dataset (10M+ records)", "notes": "Isolated from QA and Staging; provisioned on demand" }
    ],
    "thirdPartyDependencies": "specific third-party services for ${productName} — sandbox access lead time: 5–10 business days; request at project kickoff"
  },
  "people": {
    "roles": [
      { "role": "Test Lead", "name": "TBD — confirm with stakeholder", "responsibility": "Owns test strategy and test plan; coordinates all testing phases; sign-off authority" },
      { "role": "Functional Testers", "name": "TBD", "responsibility": "Design and execute functional, regression, and smoke test cases; raise defects in JIRA" },
      { "role": "Automation Engineers", "name": "TBD", "responsibility": "Build and maintain Playwright automation suite; integrate with CI/CD pipeline; maintain Allure reports" },
      { "role": "Security Tester", "name": "TBD", "responsibility": "Execute OWASP ZAP and Burp Suite scans; validate OWASP Top 10 compliance; produce security assessment report" },
      { "role": "Performance Engineer", "name": "TBD", "responsibility": "Design and execute k6 load/stress/soak/spike scenarios; validate SLA targets; produce performance report" },
      { "role": "Business / UAT Participants", "name": "TBD — nominated by Product Owner", "responsibility": "Validate core workflows against business requirements; provide formal sign-off on UAT completion" }
    ],
    "teamSize": "specific team size for ${productName} project duration",
    "escalationPath": "Blocking issues are escalated from Tester → Test Lead → Project Manager → Steering Committee / Sponsor within 2 business hours of identification. P0 defects trigger immediate escalation without waiting period."
  },
  "toolsAndTechniques": {
    "testDesignTechniques": [
      "Black-box testing — validate against functional requirements without knowledge of internals",
      "White-box testing — code coverage and branch testing in collaboration with developers",
      "Boundary Value Analysis — test at minimum, maximum, and just-beyond-boundary input values",
      "Equivalence Partitioning — group inputs into valid/invalid classes; test one representative from each",
      "Exploratory Testing — charter-based unscripted testing for new features and edge case discovery",
      "Use Case / Scenario Testing — validate complete end-to-end user journeys",
      "Decision Table Testing — test all combinations of business rule conditions"
    ],
    "automationStack": "Playwright (TypeScript) with Page Object Model — automation scope: regression suite (>= 80% P0/P1 coverage) and smoke suite; CI gate on every PR via GitHub Actions; reporting via Allure Report",
    "performanceTooling": "k6 (load, stress, soak, spike scenarios) + Grafana dashboards for real-time monitoring — target thresholds: P95 < 2s at expected load, P99 < 4s, error rate < 0.1% at peak",
    "securityTooling": "OWASP ZAP (DAST automated scan) + Burp Suite (manual pen-testing) — standards: OWASP Top 10 2021 (A01–A10); additional compliance checks per ${productName} regulatory requirements",
    "compatibilityTooling": "BrowserStack — browsers: Chrome (latest 2), Firefox (latest 2), Safari (latest 2), Edge (latest 2); devices: iOS 17, Android 14; screen sizes: 1920x1080, 1280x720, 375x812 (mobile)",
    "testManagement": "JIRA with Zephyr Scale for test case management and execution tracking — defect workflow: New → Triaged → In Progress → Fixed → Verified → Closed; traceability matrix maintained in Confluence"
  },
  "schedule": {
    "phases": [
      { "phase": "Phase 1 — Smoke & Functional Testing", "timeframe": "Month 1, Weeks 1–2", "activities": "Environment setup; smoke test execution; core functional test execution; defect triage" },
      { "phase": "Phase 2 — Integration & Security Testing", "timeframe": "Month 1–2, Weeks 3–4", "activities": "End-to-end workflow testing; API integration validation; OWASP security scan; penetration testing" },
      { "phase": "Phase 3 — Performance & Compatibility Testing", "timeframe": "Month 2, Weeks 5–6", "activities": "k6 load and stress test execution; browser and device compatibility validation; SLA verification" },
      { "phase": "Phase 4 — Regression & UAT", "timeframe": "Month 3, Weeks 7–8", "activities": "Full automated regression suite execution; UAT with business stakeholders; release readiness review; sign-off" }
    ],
    "sprintCadence": "2-week sprints — test execution aligned to sprint demos; automated regression runs nightly on main branch",
    "projectTimeline": "specific start month/year to end month/year based on ${productName} release plan"
  },
  "deliverables": [
    "Test Strategy Document (this document — IEEE 829 aligned)",
    "Test Plan Document (detailed per-sprint plan with test case assignments)",
    "Unit / Integration / System Test Execution Reports (JIRA + Zephyr dashboards)",
    "Performance Test Results Report (k6 HTML report + Grafana screenshots)",
    "Security Assessment Report (OWASP ZAP scan output + Burp Suite findings)",
    "Accessibility Audit Report (axe DevTools + WAVE scan results)",
    "UAT Sign-off Report (formal sign-off document with business stakeholder signatures)",
    "Requirements-to-Test Traceability Matrix (100% in-scope requirement coverage mapped to test cases)",
    "Defect Summary Report (open/closed by severity and priority at release)",
    "Automation Suite Repository (Playwright framework with README and CI/CD pipeline link)"
  ]
}`;
  }

  async callGroqAPI(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior QA architect generating enterprise test strategy documents. Always return valid JSON only — no markdown, no code fences, no explanatory text.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 6000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `GROQ API error ${response.status}: ${errText.substring(0, 300)}`,
        };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return { success: true, content };
    } catch (error) {
      return { success: false, error: `GROQ API call failed: ${error.message}` };
    }
  }

  parseStrategy(content, input) {
    try {
      let cleaned = content.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found in response');
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
        inputMode: input.key ? 'jira' : 'prd',
      };
    } catch (error) {
      console.error('Strategy parse error, using fallback:', error.message);
      return this.createFallbackStrategy(input);
    }
  }

  createFallbackStrategy(input) {
    const productName = input.productName || 'Product Under Test';
    const today = new Date().toISOString().split('T')[0];
    return {
      generatedAt: new Date().toISOString(),
      inputMode: 'prd',
      metadata: {
        documentStatus: 'Draft',
        preparedBy: 'QA Team',
        role: 'Senior QA Test Architect',
        date: today,
        productName,
        productVersion: input.version || '1.0',
        productType: input.productType || 'Web Application (SaaS)',
        businessObjective: `Release ${productName} with verified quality against all core user workflows.`,
        projectTimeline: 'TBD — confirm with stakeholder',
        sprintCadence: '2-week sprints',
        teamComposition: 'TBD — confirm with stakeholder',
        usabilityPanelSize: '8 participants',
        automationTooling: ['Playwright', 'REST Assured'],
        loadPerfTooling: ['k6', 'Grafana'],
        securityStandards: ['OWASP Top 10 2021'],
        browsersDevices: ['Chrome Latest', 'Firefox Latest', 'Safari Latest', 'Edge Latest'],
        thirdPartyServices: ['TBD — confirm with stakeholder'],
      },
      objectives: {
        primaryObjective: `Validate that ${productName} meets its business goals with no critical defects impacting core workflows at release.`,
        qualityGoals: {
          criticalHighDefects: 'Zero Critical/High severity defects open at release sign-off',
          defectLeakage: '< 5% defect leakage to production',
          testCoverage: '>= 95% test coverage of all in-scope workflows',
        },
        successMetrics: [
          'All Entry/Exit criteria satisfied for every test phase',
          'Traceability matrix shows 100% coverage of in-scope requirements',
          'UAT sign-off obtained from business stakeholder',
          'Performance SLAs verified: P95 < 2s',
          'Zero Critical OWASP vulnerabilities at release',
        ],
      },
      scope: {
        inScopeWorkflows: ['Core user workflows', 'Authentication and session management', 'Data input and validation', 'Integration with third-party services', 'Reporting and exports'],
        inScopeModules: ['Core Feature Module', 'Authentication & Authorisation', 'API Layer', 'UI / Frontend', 'Data Management'],
        outOfScope: ['Third-party service internals', 'Legacy browser support (IE11)', 'Production database direct access', 'Infrastructure provisioning'],
        testLevels: [
          { level: 'Unit Testing', owner: 'Dev / QA', coverageTarget: '>= 80% code coverage', tooling: 'Jest / JUnit' },
          { level: 'Integration Testing', owner: 'QA', coverageTarget: 'All exposed APIs', tooling: 'Postman / REST Assured' },
          { level: 'System Testing', owner: 'QA', coverageTarget: 'All in-scope workflows', tooling: 'Manual + Playwright' },
          { level: 'Security Testing', owner: 'Security / QA', coverageTarget: 'OWASP Top 10 A01–A10', tooling: 'OWASP ZAP + Burp Suite' },
          { level: 'Performance Testing', owner: 'Performance Engineer', coverageTarget: 'P95 < 2s at expected load', tooling: 'k6 + Grafana' },
          { level: 'Functional Testing', owner: 'QA', coverageTarget: 'All functional requirements', tooling: 'Manual + Playwright' },
          { level: 'Regression Testing', owner: 'QA', coverageTarget: '>= 80% P0/P1 automated', tooling: 'Playwright + GitHub Actions' },
          { level: 'Smoke Testing', owner: 'QA', coverageTarget: 'Critical path every build', tooling: 'Playwright (CI gate)' },
          { level: 'Usability Testing', owner: 'UX / QA', coverageTarget: '8 participant panel', tooling: 'Moderated sessions' },
          { level: 'Compatibility Testing', owner: 'QA', coverageTarget: 'Chrome, Firefox, Safari, Edge', tooling: 'BrowserStack' },
        ],
      },
      risks: [
        { risk: 'Test environment instability causing false failures', likelihood: 'Medium', impact: 'High', mitigation: 'Daily environment health checks; containerised environments', owner: 'DevOps Lead' },
        { risk: 'Third-party sandbox access delays blocking integration tests', likelihood: 'Medium', impact: 'High', mitigation: 'Request access at project kickoff; maintain mock/stub fallback', owner: 'Integration Owner' },
        { risk: 'Scope creep adding untested features at release cutoff', likelihood: 'Medium', impact: 'High', mitigation: 'Strict change control; impact assessment for late additions', owner: 'QA Lead + PM' },
        { risk: 'Resource unavailability (testers / automation engineers)', likelihood: 'Low', impact: 'High', mitigation: 'Cross-train team; maintain backup resource list', owner: 'QA Manager' },
        { risk: 'Schedule compression forcing skip of non-functional testing', likelihood: 'Medium', impact: 'High', mitigation: 'Enforce Entry/Exit criteria; signed waiver required for any skip', owner: 'Project Manager' },
      ],
      criteria: {
        phases: [
          { phase: 'Unit', entryCriteria: 'Code complete; unit test framework configured; PR review approved', exitCriteria: '>= 80% code coverage; no open Critical defects' },
          { phase: 'Integration', entryCriteria: 'Unit exit met; test environment + API contracts available', exitCriteria: 'All interface/data validations pass; defects triaged' },
          { phase: 'System', entryCriteria: 'Integration exit met; test data loaded; environment stable 24h', exitCriteria: 'All in-scope workflows pass; Critical/High defects = 0' },
          { phase: 'Security', entryCriteria: 'System exit met; security tooling configured', exitCriteria: 'No Critical/High vulnerabilities; OWASP A01–A10 signed off' },
          { phase: 'Performance', entryCriteria: 'System exit met; perf environment provisioned', exitCriteria: 'P95 < 2s at expected load; stable at 2x concurrent users' },
          { phase: 'UAT', entryCriteria: 'All QA phases complete; no P0/P1 open defects', exitCriteria: 'Business stakeholder sign-off obtained' },
        ],
        suspensionCriteria: 'Testing is suspended if a Critical/Blocker defect prevents continued execution of a core workflow, or if the test environment is unavailable for more than 4 consecutive hours.',
        resumptionCriteria: 'Testing resumes once the blocking defect is fixed and re-verified, or environment availability is restored and confirmed stable. A smoke run must pass before full testing resumes.',
      },
      environment: {
        environments: [
          { name: 'Dev', purpose: 'Unit and early integration testing', dataStrategy: 'Synthetic data only', notes: 'Refreshed per sprint start' },
          { name: 'QA', purpose: 'Functional / Integration / System testing', dataStrategy: 'Masked production data or synthetic', notes: 'Refresh cadence: weekly' },
          { name: 'Staging', purpose: 'Pre-release validation and performance testing', dataStrategy: 'Production-like volume, masked PII', notes: 'Mirrors production config' },
          { name: 'UAT', purpose: 'Business stakeholder validation', dataStrategy: 'Masked production data', notes: 'Locked during UAT window' },
          { name: 'Performance', purpose: 'Load / stress / soak / spike testing', dataStrategy: 'Production-scale synthetic data', notes: 'Isolated from QA / Staging' },
        ],
        thirdPartyDependencies: 'TBD — list all third-party services; sandbox access lead time: 5–10 business days',
      },
      people: {
        roles: [
          { role: 'Test Lead', name: 'TBD', responsibility: 'Owns test strategy and plan; coordinates all phases; sign-off authority' },
          { role: 'Functional Testers', name: 'TBD', responsibility: 'Execute functional, regression, and smoke test cases; raise defects in JIRA' },
          { role: 'Automation Engineers', name: 'TBD', responsibility: 'Build and maintain Playwright automation suite; maintain CI/CD integration' },
          { role: 'Security Tester', name: 'TBD', responsibility: 'Execute OWASP ZAP scans; validate OWASP Top 10 compliance' },
          { role: 'Performance Engineer', name: 'TBD', responsibility: 'Design and execute k6 load/stress/soak/spike scenarios; validate SLAs' },
          { role: 'Business / UAT Participants', name: 'TBD', responsibility: 'Validate workflows against business requirements; provide formal sign-off' },
        ],
        teamSize: 'TBD — confirm with stakeholder',
        escalationPath: 'Tester → Test Lead → Project Manager → Steering Committee within 2 business hours of identification',
      },
      toolsAndTechniques: {
        testDesignTechniques: [
          'Black-box testing — validate against functional requirements',
          'Boundary Value Analysis — test at min, max, and just-beyond-boundary input values',
          'Equivalence Partitioning — group inputs into valid/invalid classes',
          'Exploratory Testing — charter-based unscripted testing for edge case discovery',
          'Use Case / Scenario Testing — validate complete end-to-end user journeys',
          'Decision Table Testing — test all combinations of business rule conditions',
        ],
        automationStack: 'Playwright (TypeScript) with Page Object Model — scope: regression and smoke suites; CI gate via GitHub Actions; Allure Report for dashboards',
        performanceTooling: 'k6 (load, stress, soak, spike) + Grafana — P95 < 2s at expected load; error rate < 0.1% at peak',
        securityTooling: 'OWASP ZAP (DAST) + Burp Suite (manual pen-testing) — OWASP Top 10 2021 (A01–A10)',
        compatibilityTooling: 'BrowserStack — Chrome, Firefox, Safari, Edge (latest 2 versions); iOS 17; Android 14',
        testManagement: 'JIRA with Zephyr Scale — defect workflow: New → Triaged → In Progress → Fixed → Verified → Closed; traceability in Confluence',
      },
      schedule: {
        phases: [
          { phase: 'Phase 1 — Smoke & Functional Testing', timeframe: 'Month 1, Weeks 1–2', activities: 'Environment setup; smoke execution; core functional testing; defect triage' },
          { phase: 'Phase 2 — Integration & Security Testing', timeframe: 'Month 1–2, Weeks 3–4', activities: 'End-to-end workflow testing; API integration; OWASP security scan; pen testing' },
          { phase: 'Phase 3 — Performance & Compatibility Testing', timeframe: 'Month 2, Weeks 5–6', activities: 'k6 load and stress execution; browser/device compatibility; SLA verification' },
          { phase: 'Phase 4 — Regression & UAT', timeframe: 'Month 3, Weeks 7–8', activities: 'Full automated regression suite; UAT with business stakeholders; release readiness review; sign-off' },
        ],
        sprintCadence: '2-week sprints — testing aligned to sprint demos; automated regression runs nightly',
        projectTimeline: 'TBD — confirm with stakeholder',
      },
      deliverables: [
        'Test Strategy Document (this document — IEEE 829 aligned)',
        'Test Plan Document (detailed per-sprint plan)',
        'Unit / Integration / System Test Execution Reports',
        'Performance Test Results Report (k6 HTML + Grafana screenshots)',
        'Security Assessment Report (OWASP ZAP + Burp Suite findings)',
        'Accessibility Audit Report (axe DevTools + WAVE)',
        'UAT Sign-off Report (formal sign-off with stakeholder signatures)',
        'Requirements-to-Test Traceability Matrix (100% in-scope coverage)',
        'Defect Summary Report (open/closed by severity at release)',
        'Automation Suite Repository (Playwright framework + CI/CD pipeline link)',
      ],
    };
  }
}

export { VALID_GROQ_MODELS };
export default TestStrategyGenerator;
