/**
 * testStrategyService.js
 * B.L.A.S.T. Framework — RICE-POT Test Strategy Engine
 *
 * RICE-POT = Risks · Items · Criteria · Environment · People · Objectives · Tools
 * Persona: Senior Test Strategy Director, 20+ years, ISTQB Expert Level
 */

const VALID_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

class TestStrategyService {
  constructor(apiKey, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = VALID_GROQ_MODELS.includes(model) ? model : 'llama-3.3-70b-versatile';
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }

  async generateStrategy(input) {
    try {
      const prompt = this.buildRICEPOTPrompt(input);
      const response = await this.callGroqAPI(prompt);
      if (!response.success) return { success: false, error: response.error };
      const strategy = this.parseStrategy(response.content, input);
      return { success: true, strategy };
    } catch (error) {
      return { success: false, error: `Strategy generation failed: ${error.message}` };
    }
  }

  buildRICEPOTPrompt(input) {
    const productName = input.productName || 'Product Under Test';
    const description = input.requirements || 'No requirements provided';
    const productType = input.productType || 'Web Application (SaaS)';
    const version = input.version || '1.0';
    const today = new Date().toISOString().split('T')[0];
    const req = description.length > 900 ? description.slice(0, 900) + '...' : description;

    return `You are a Senior Test Strategy Director (20+ years enterprise QA, ISTQB Expert Level). Generate a RICE-POT test strategy document as a single valid JSON object — no markdown, no code fences, no extra text.

PRODUCT: ${productName} | TYPE: ${productType} | VERSION: ${version} | DATE: ${today}
REQUIREMENTS: ${req}

RICE-POT framework: Risks · Items · Criteria · Environment · People · Objectives · Tools

Return ONLY this JSON structure with ALL fields filled with content SPECIFIC to "${productName}":

{"metadata":{"productName":"${productName}","version":"${version}","productType":"${productType}","documentVersion":"1.0","createdDate":"${today}","status":"Draft","owner":"QA Strategy Director","reviewCycle":"Per release","classification":"Internal — Confidential"},"executiveSummary":"3-4 sentence overview of the testing strategy and quality philosophy specific to ${productName} and its users.","risks":{"overview":"Risk management statement for ${productName}.","register":[{"id":"R001","category":"Technical","risk":"Specific technical risk for ${productName}","probability":"High","impact":"High","riskScore":"High","mitigation":"Concrete mitigation steps","contingency":"Fallback if mitigation fails","owner":"QA Lead + Dev Lead"},{"id":"R002","category":"Process","risk":"Process risk for ${productName} testing","probability":"Medium","impact":"High","riskScore":"High","mitigation":"Mitigation action","contingency":"Contingency plan","owner":"QA Lead"},{"id":"R003","category":"Resource","risk":"Resource/people risk","probability":"Low","impact":"Medium","riskScore":"Medium","mitigation":"Mitigation action","contingency":"Contingency","owner":"QA Lead + PM"},{"id":"R004","category":"External","risk":"External dependency risk specific to ${productName}","probability":"Medium","impact":"Medium","riskScore":"Medium","mitigation":"Mitigation","contingency":"Contingency","owner":"QA Lead"},{"id":"R005","category":"Security","risk":"Security-specific risk for ${productName}","probability":"Medium","impact":"High","riskScore":"High","mitigation":"Security mitigation","contingency":"Security contingency","owner":"Security Lead + QA Lead"}]},"items":{"overview":"Scope boundary statement for ${productName}.","inScope":[{"item":"Core feature specific to ${productName} — feature 1","priority":"P0","testingType":"Functional","riskLevel":"High","rationale":"Primary user-facing functionality"},{"item":"Core feature specific to ${productName} — feature 2","priority":"P0","testingType":"Functional + Integration","riskLevel":"High","rationale":"Critical data flow"},{"item":"Authentication and authorisation","priority":"P0","testingType":"Security + Functional","riskLevel":"High","rationale":"Access control is critical for ${productName}"},{"item":"Performance under expected and peak load","priority":"P1","testingType":"Performance","riskLevel":"High","rationale":"SLA obligations"},{"item":"OWASP Top 10 security validation","priority":"P0","testingType":"Security","riskLevel":"High","rationale":"Regulatory and data protection requirements"},{"item":"WCAG 2.1 AA accessibility compliance","priority":"P1","testingType":"Accessibility","riskLevel":"Medium","rationale":"Legal accessibility requirement and inclusive design"},{"item":"REST API layer validation","priority":"P0","testingType":"Integration","riskLevel":"High","rationale":"Core integration point for ${productName}"}],"outOfScope":["Third-party service internals (tested via contract testing only)","Legacy browser support (Internet Explorer)","Infrastructure configuration and provisioning","Manual load balancer testing","Production database direct access"],"assumptions":["Test environment will be provisioned and stable before test execution begins","Test data will be seeded by the DevOps team per agreed data requirements","All P0 development features will be code-complete one sprint before QA phase","JIRA and Zephyr Scale will be configured for this release before Day 1","Security tooling (OWASP ZAP) approved and whitelisted in QA network"]},"criteria":{"overview":"Entry and exit gate governance for each test phase of ${productName}.","phases":[{"phase":"Smoke Testing","duration":"1 day","entryCriteria":["Build successfully deployed to QA environment","Deployment verification checklist signed off by DevOps","Test data seeded and verified by QA Lead"],"exitCriteria":["100% of P0 critical user paths accessible","Zero P0 build-breaking defects","Environment health check green"]},{"phase":"Functional Testing","duration":"4-5 days","entryCriteria":["Smoke testing 100% pass rate","All test cases peer-reviewed and approved in Zephyr","Test environment stable for 24+ hours"],"exitCriteria":[">=95% test case execution rate",">=95% test case pass rate","All P0 and P1 defects resolved or formally deferred","Requirements traceability matrix 100% linked"]},{"phase":"Integration Testing","duration":"2 days","entryCriteria":["Functional testing >80% complete","Integration environment stable","Mocks replaced by real service connections in QA"],"exitCriteria":["All end-to-end integration scenarios pass","No data corruption detected across service boundaries","Contract tests pass for all external APIs"]},{"phase":"Performance Testing","duration":"2 days","entryCriteria":["Functional testing 100% complete","Performance environment provisioned with production-equivalent data (100k+ records)","k6 scripts reviewed and approved"],"exitCriteria":["P95 response time < 2 seconds at expected load","Error rate < 0.1% at expected concurrent users","System stable under 2x peak load (graceful degradation only)","No memory leaks detected in 60-minute soak test"]},{"phase":"Security Testing","duration":"2 days","entryCriteria":["Functional testing >90% complete","OWASP ZAP Docker image deployed and whitelisted","Security test plan approved by Security Lead"],"exitCriteria":["Zero Critical or High CVEs open at phase close","OWASP A01-A10 all tested and documented","Penetration test report reviewed and signed off","All authentication bypass vectors tested"]},{"phase":"Accessibility Testing","duration":"1 day","entryCriteria":["Functional testing 100% complete","axe DevTools configured in Playwright CI"],"exitCriteria":["Zero critical axe DevTools violations","All text colour contrast >= 4.5:1 (normal text) and >= 3:1 (large text)","Complete keyboard navigation without mouse","Screen reader tested on primary user flows (NVDA + Chrome)"]},{"phase":"User Acceptance Testing (UAT)","duration":"2-3 days","entryCriteria":["All QA test phases complete and exit criteria met","Zero open P0/P1 defects","UAT environment configured with anonymised production-like data","UAT test scripts distributed to business testers"],"exitCriteria":["Business stakeholder sign-off obtained","UAT test report approved by Product Owner","Release notes reviewed and approved","Go/No-Go decision recorded in JIRA"]}],"releaseExitCriteria":["Overall test case pass rate >= 95%","Zero open P0 (Blocker) defects","Zero open Critical severity defects at release cut","Performance SLAs validated: P95 < 2s at expected load","Security: Zero Critical/High CVEs, OWASP A01-A10 complete","Accessibility: WCAG 2.1 AA certified, zero critical axe violations","UAT sign-off from Product Owner and key stakeholders","Test summary report reviewed and archived"]},"environment":{"overview":"Multi-tier test environment strategy for ${productName}.","environments":[{"name":"Development (Dev)","type":"Development","purpose":"Developer unit and integration testing during active development","infrastructure":"Shared cloud (auto-provisioned per PR)","dataStrategy":"Synthetic data, ephemeral — reset on each deploy","owner":"Engineering Team","healthCheck":"CI pipeline green on every merge"},{"name":"QA / Staging","type":"Staging","purpose":"Primary functional, integration, and accessibility testing environment","infrastructure":"Cloud — production-equivalent config, separate resource pool","dataStrategy":"Anonymised production data subset refreshed weekly + synthetic edge case data","owner":"QA Team","healthCheck":"Daily automated smoke test at 08:00 UTC"},{"name":"Performance (Perf)","type":"Performance","purpose":"Load testing, stress testing, soak testing","infrastructure":"Cloud — production-equivalent node sizing and DB instance class","dataStrategy":"Seeded with 100k+ representative records, no PII","owner":"QA Lead + DevOps","healthCheck":"Pre-test health check script in k6 setup phase"},{"name":"Security (Sec)","type":"Isolated Staging","purpose":"OWASP ZAP scanning, penetration testing — fully isolated network","infrastructure":"Air-gapped staging instance, no egress to external services","dataStrategy":"Synthetic data only, no customer data under any circumstances","owner":"Security Team + QA Lead","healthCheck":"Network isolation verified before scan start"},{"name":"UAT (Pre-production)","type":"Pre-production","purpose":"Business stakeholder acceptance testing","infrastructure":"Production-equivalent — mirrors live infrastructure config","dataStrategy":"Anonymised production data refreshed 48 hours before UAT","owner":"Business Analyst + QA Lead","healthCheck":"Daily smoke test during UAT period"},{"name":"Production","type":"Production","purpose":"Post-deployment smoke testing and canary validation only","infrastructure":"Live production","dataStrategy":"Real data — read-only smoke tests only, no test data creation","owner":"Release Manager + QA Lead","healthCheck":"Automated post-deploy smoke suite in CI/CD pipeline"}],"requirements":["All non-production environments must be accessible via VPN only","Environment configuration as code (Terraform/Ansible) version-controlled in same repo","Daily automated health check with PagerDuty alert if environment down","Data refresh schedule: QA weekly, UAT 48h before phase start","Environment parity checklist validated before each test phase gate"]},"people":{"overview":"Cross-functional quality team structure and accountability for ${productName}.","roles":[{"role":"QA Strategy Director","responsibilities":["Own and maintain the RICE-POT test strategy","Executive stakeholder communication and risk reporting","Release Go/No-Go sign-off authority","Test governance and process improvement"],"skills":["ISTQB Expert Level","Risk-based testing","Executive communication","Quality metrics"],"allocation":"25%","reportingLine":"VP Engineering"},{"role":"QA Lead","responsibilities":["Test plan creation, maintenance, and approval","Day-to-day team coordination and sprint planning","Test metrics collection and trend reporting","Defect triage facilitation"],"skills":["ISTQB Advanced Level","JIRA + Zephyr Scale","Test planning","Agile QA"],"allocation":"100%","reportingLine":"QA Strategy Director"},{"role":"Senior Test Engineer","responsibilities":["Complex test case design (functional, integration, boundary, edge)","Exploratory testing and heuristic analysis","Defect validation and regression verification","Peer review of junior test cases"],"skills":["Advanced testing techniques","API testing (Postman)","ISTQB Foundation","Agile ceremonies"],"allocation":"100%","reportingLine":"QA Lead"},{"role":"Automation Engineer","responsibilities":["Playwright TypeScript framework design and maintenance","CI/CD pipeline integration (GitHub Actions)","Automated regression suite execution and triage","Performance test scripts (k6)"],"skills":["Playwright TypeScript","GitHub Actions","k6 performance testing","axe DevTools accessibility"],"allocation":"100%","reportingLine":"QA Lead"},{"role":"Security Test Engineer","responsibilities":["OWASP Top 10 test execution","OWASP ZAP scan configuration and interpretation","Penetration test coordination with third-party vendors","Security defect documentation and severity rating"],"skills":["OWASP ZAP","Burp Suite","CEH or OSCP","Secure SDLC"],"allocation":"50%","reportingLine":"Security Lead (matrix to QA Lead)"}],"raci":[{"activity":"RICE-POT Strategy Approval","responsible":"QA Strategy Director","accountable":"VP Engineering","consulted":"QA Lead, PM, Dev Lead","informed":"All Stakeholders"},{"activity":"Test Plan Creation and Approval","responsible":"QA Lead","accountable":"QA Strategy Director","consulted":"Dev Lead, Product Owner","informed":"PM, Stakeholders"},{"activity":"Test Case Design","responsible":"Senior Test Engineer","accountable":"QA Lead","consulted":"Dev Team, Product Owner","informed":"PM"},{"activity":"Test Environment Provisioning","responsible":"DevOps Engineer","accountable":"QA Lead","consulted":"QA Team","informed":"PM"},{"activity":"Test Execution","responsible":"Test Engineers","accountable":"QA Lead","consulted":"Dev Team","informed":"PM, Stakeholders"},{"activity":"Defect Triage","responsible":"QA Lead","accountable":"Dev Lead","consulted":"Test Engineers, QA Strategy Director","informed":"PM, Stakeholders"},{"activity":"Performance Testing","responsible":"Automation Engineer","accountable":"QA Lead","consulted":"Dev Lead, DevOps","informed":"PM"},{"activity":"Security Testing","responsible":"Security Test Engineer","accountable":"Security Lead","consulted":"QA Lead, Dev Lead","informed":"PM, Legal"},{"activity":"UAT Coordination","responsible":"Business Analyst","accountable":"Product Owner","consulted":"QA Lead","informed":"All Stakeholders"},{"activity":"Release Go/No-Go Decision","responsible":"QA Lead","accountable":"QA Strategy Director","consulted":"Dev Lead, PM, Security Lead","informed":"All Stakeholders, C-Suite"}]},"objectives":{"overview":"Quality vision and measurable outcomes for ${productName}.","qualityVision":"Deliver ${productName} at enterprise-grade quality — zero critical defects, validated performance, and security-hardened — to earn user trust and support sustainable release velocity.","objectives":[{"objective":"Functional Quality","kpi":"Test case pass rate","target":">=95%","measurement":"Zephyr Scale test execution report","reportingFrequency":"Daily during execution"},{"objective":"Defect Detection Efficiency","kpi":"Defects found in QA vs Production","target":">=85% detected before production","measurement":"JIRA defect origin field tracking","reportingFrequency":"Post-release"},{"objective":"Release Readiness","kpi":"Open critical defects at release cut","target":"0 open P0/Critical defects","measurement":"JIRA release filter","reportingFrequency":"Daily during final week"},{"objective":"Performance SLA","kpi":"P95 response time under expected load","target":"<2 seconds","measurement":"k6 performance test report","reportingFrequency":"End of performance phase"},{"objective":"Security Compliance","kpi":"OWASP A01-A10 coverage and CVE count","target":"100% OWASP coverage, 0 Critical/High CVEs","measurement":"ZAP scan report + manual test evidence","reportingFrequency":"End of security phase"},{"objective":"Accessibility","kpi":"WCAG 2.1 AA compliance","target":"Zero critical axe violations, contrast >= 4.5:1","measurement":"axe DevTools CI report","reportingFrequency":"End of accessibility phase"},{"objective":"Requirements Coverage","kpi":"Requirements with linked test cases","target":"100% of P0/P1 requirements","measurement":"Zephyr traceability matrix","reportingFrequency":"Weekly during test design"},{"objective":"Automation Coverage","kpi":"P0/P1 scenarios automated","target":">=80% of P0/P1 covered in Playwright regression","measurement":"GitHub Actions test report","reportingFrequency":"Weekly"}],"reportingCadence":[{"report":"Daily Defect Dashboard","audience":"QA Team + Dev Lead","frequency":"Daily during execution sprints","format":"JIRA dashboard (live)","owner":"QA Lead"},{"report":"Weekly Test Progress Report","audience":"PM + Product Owner + Stakeholders","frequency":"Every Friday during test phase","format":"Confluence page + email summary","owner":"QA Lead"},{"report":"Phase Gate Report","audience":"QA Strategy Director + PM + Dev Lead","frequency":"End of each test phase","format":"PDF report + JIRA phase summary","owner":"QA Lead"},{"report":"Release Readiness Report","audience":"All Stakeholders + C-Suite","frequency":"48 hours before release cut","format":"Executive PDF + Go/No-Go dashboard","owner":"QA Strategy Director"},{"report":"Post-Release Quality Report","audience":"VP Engineering + PM + QA Team","frequency":"1 week after production release","format":"Retrospective PDF with trend analysis","owner":"QA Lead + QA Strategy Director"}]},"tools":{"overview":"Best-in-class tool ecosystem selected for ${productName} based on integration, scalability, and team expertise.","categories":[{"category":"Test Management","primary":"JIRA + Zephyr Scale","alternative":"TestRail","rationale":"Native JIRA integration provides unified defect and test tracking. Zephyr Scale offers traceability matrix, test cycles, and RICE-POT metrics dashboards in one platform.","licenceType":"Commercial — per seat","setupRequired":["Zephyr Scale licence activation","Project configuration and test cycle templates","Custom fields for RICE-POT metrics","Dashboard creation for daily reporting"]},{"category":"Test Automation — UI & API","primary":"Playwright (TypeScript)","alternative":"Cypress","rationale":"Cross-browser and cross-platform (Chrome, Firefox, Safari, Edge, mobile). Built-in parallel execution, auto-waiting, and network interception. Native axe integration for accessibility. Strong GitHub Actions support.","licenceType":"Open Source (MIT)","setupRequired":["Node.js 18+ and npm","Playwright install and browser binaries","GitHub Actions workflow files","Allure Report integration","Page Object Model scaffolding"]},{"category":"API Testing","primary":"Postman + Newman (CI)","alternative":"REST Assured (Java)","rationale":"Postman provides visual collection builder for exploratory API testing. Newman enables automated API regression in CI pipeline. Environment-based configuration matches test environments.","licenceType":"Postman Free Tier / Team","setupRequired":["Postman workspace","Environment files (Dev, QA, UAT, Prod)","Newman npm install","CI pipeline step"]},{"category":"Performance Testing","primary":"k6 + Grafana Cloud","alternative":"Apache JMeter","rationale":"Code-first JavaScript scripts version-controlled alongside tests. Native Grafana metrics dashboard for real-time load visualisation. Docker image for CI execution without installation overhead.","licenceType":"k6 Open Source + Grafana Cloud Free Tier","setupRequired":["k6 binary or Docker image","Grafana Cloud account","Performance environment provisioning","k6 script templates (load, stress, soak)"]},{"category":"Security Testing","primary":"OWASP ZAP","alternative":"Burp Suite Professional","rationale":"Industry-standard open-source DAST tool. Docker-based CI integration via ZAP Baseline Scan. Comprehensive OWASP A01-A10 active scanning. Integrates with GitHub Actions for automated security gates.","licenceType":"Open Source (Apache 2.0)","setupRequired":["ZAP Docker image in CI","Network whitelist for QA environment","OWASP context file","Baseline and full scan configurations"]},{"category":"Accessibility Testing","primary":"axe DevTools + @axe-core/playwright","alternative":"WAVE + NVDA manual","rationale":"axe-core guarantees zero false positives. Playwright integration enables accessibility checks in automated regression. Covers WCAG 2.1 A and AA automatically. Screen reader testing with NVDA for manual coverage.","licenceType":"axe-core Open Source + axe DevTools Free","setupRequired":["@axe-core/playwright npm package","Playwright fixture setup","NVDA screen reader (free)","Accessibility test templates"]},{"category":"CI/CD Pipeline","primary":"GitHub Actions","alternative":"Jenkins","rationale":"Native GitHub integration with no additional infrastructure. Marketplace actions for Playwright, ZAP, k6, and Allure. Matrix builds for cross-browser parallel execution.","licenceType":"GitHub Actions (included in GitHub)","setupRequired":["Workflow YAML files","GitHub Secrets for API keys and tokens","Branch protection rules","Required status checks for test gates"]},{"category":"Test Reporting","primary":"Allure Report","alternative":"ExtentReports","rationale":"Rich interactive HTML reports with trend analysis. Native Playwright integration. Supports categories, environments, and history tabs. Can be hosted on GitHub Pages free.","licenceType":"Open Source (Apache 2.0)","setupRequired":["allure-playwright npm package","allure-commandline npm package","GitHub Pages or self-hosted server","Report history configuration"]}]}}`;
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
              content: 'You are a senior QA strategy director generating RICE-POT test strategy documents. Always return valid JSON only — no markdown, no code fences, no explanatory text before or after the JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.25,
          max_tokens: 6000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `GROQ API error ${response.status}: ${errText.substring(0, 300)}` };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return { success: true, content };
    } catch (error) {
      return { success: false, error: `API call failed: ${error.message}` };
    }
  }

  parseStrategy(content, input) {
    try {
      let cleaned = content.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
        productName: input.productName || 'Product Under Test',
        productType: input.productType || 'Web Application (SaaS)',
        version: input.version || '1.0',
      };
    } catch (error) {
      console.error('Strategy parse error:', error.message);
      return this.createFallbackStrategy(input);
    }
  }

  createFallbackStrategy(input) {
    const productName = input.productName || 'Product Under Test';
    const today = new Date().toISOString().split('T')[0];
    return {
      generatedAt: new Date().toISOString(),
      productName,
      productType: input.productType || 'Web Application (SaaS)',
      version: input.version || '1.0',
      metadata: {
        productName,
        version: input.version || '1.0',
        productType: input.productType || 'Web Application',
        documentVersion: '1.0',
        createdDate: today,
        status: 'Draft',
        owner: 'QA Strategy Director',
        classification: 'Internal — Confidential',
      },
      executiveSummary: `RICE-POT test strategy for ${productName}. This strategy defines the complete quality approach including risk management, scope definition, phase criteria, environment setup, team accountability, quality objectives, and tool ecosystem. The goal is enterprise-grade quality assurance aligned with business objectives and regulatory requirements.`,
      risks: {
        overview: 'Risk-based approach prioritising high-probability / high-impact testing risks.',
        register: [
          { id: 'R001', category: 'Technical', risk: 'Unstable QA environment causing false test failures', probability: 'Medium', impact: 'High', riskScore: 'High', mitigation: 'Daily environment health checks; containerised test environments', contingency: 'Escalate to DevOps; rerun on stable branch', owner: 'QA Lead + DevOps' },
          { id: 'R002', category: 'Process', risk: 'Late scope changes adding untested features at release', probability: 'Medium', impact: 'High', riskScore: 'High', mitigation: 'Strict change control after sprint planning; impact assessment mandatory', contingency: 'Risk-based subset testing; explicit PM sign-off for scope additions', owner: 'QA Lead + PM' },
          { id: 'R003', category: 'External', risk: 'Third-party API failures causing intermittent test failures', probability: 'High', impact: 'Medium', riskScore: 'High', mitigation: 'Contract testing; mock servers for external dependencies', contingency: 'Graceful degradation testing; service virtualisation', owner: 'QA Lead + Dev Lead' },
        ],
      },
      items: {
        overview: 'Scope defined based on product requirements and risk priorities.',
        inScope: [
          { item: 'Core functionality', priority: 'P0', testingType: 'Functional', riskLevel: 'High', rationale: 'Primary user value' },
          { item: 'Authentication and authorisation', priority: 'P0', testingType: 'Security + Functional', riskLevel: 'High', rationale: 'Access control critical' },
          { item: 'OWASP Top 10 security', priority: 'P0', testingType: 'Security', riskLevel: 'High', rationale: 'Regulatory requirement' },
          { item: 'Performance SLAs', priority: 'P1', testingType: 'Performance', riskLevel: 'High', rationale: 'SLA obligations' },
          { item: 'WCAG 2.1 AA accessibility', priority: 'P1', testingType: 'Accessibility', riskLevel: 'Medium', rationale: 'Legal and inclusive design' },
        ],
        outOfScope: ['Third-party service internals', 'Legacy browser support (IE)', 'Infrastructure configuration', 'Production database direct access'],
        assumptions: ['Test environment stable before test execution', 'Test data seeded by DevOps team', 'JIRA and Zephyr Scale configured'],
      },
      criteria: {
        overview: 'Entry and exit gate governance for each test phase.',
        phases: [
          { phase: 'Smoke Testing', duration: '1 day', entryCriteria: ['Build deployed to QA', 'Deployment verification complete'], exitCriteria: ['P0 paths accessible', 'Zero build-breaking defects'] },
          { phase: 'Functional Testing', duration: '4-5 days', entryCriteria: ['Smoke 100% pass', 'Test cases approved'], exitCriteria: ['>=95% execution rate', '>=95% pass rate'] },
          { phase: 'Performance Testing', duration: '2 days', entryCriteria: ['Functional complete', 'Perf env provisioned'], exitCriteria: ['P95 < 2s', 'Error rate < 0.1%'] },
          { phase: 'Security Testing', duration: '2 days', entryCriteria: ['Functional >90%', 'ZAP configured'], exitCriteria: ['Zero Critical/High CVEs', 'OWASP A01-A10 tested'] },
          { phase: 'UAT', duration: '2 days', entryCriteria: ['All QA phases complete', 'Zero P0/P1 open'], exitCriteria: ['Business sign-off', 'UAT report approved'] },
        ],
        releaseExitCriteria: ['Pass rate >= 95%', 'Zero Critical defects', 'Performance SLAs met', 'OWASP complete', 'WCAG 2.1 AA certified', 'UAT sign-off'],
      },
      environment: {
        overview: 'Multi-tier test environment strategy.',
        environments: [
          { name: 'QA / Staging', type: 'Staging', purpose: 'Primary functional and integration testing', infrastructure: 'Cloud — production-equivalent', dataStrategy: 'Anonymised data subset + synthetic data', owner: 'QA Team', healthCheck: 'Daily smoke test' },
          { name: 'Performance', type: 'Performance', purpose: 'Load, stress, soak testing', infrastructure: 'Production-equivalent sizing', dataStrategy: '100k+ seeded records', owner: 'QA + DevOps', healthCheck: 'Pre-test health check' },
          { name: 'UAT', type: 'Pre-production', purpose: 'Business stakeholder acceptance', infrastructure: 'Production-equivalent', dataStrategy: 'Anonymised prod data', owner: 'BA + QA Lead', healthCheck: 'Daily smoke during UAT' },
        ],
        requirements: ['VPN-only access', 'Environment as code (Terraform)', 'Automated health monitoring', 'Weekly data refresh'],
      },
      people: {
        overview: 'Cross-functional quality team.',
        roles: [
          { role: 'QA Strategy Director', responsibilities: ['Own strategy', 'Release sign-off'], skills: ['ISTQB Expert', 'Risk-based testing'], allocation: '25%', reportingLine: 'VP Engineering' },
          { role: 'QA Lead', responsibilities: ['Test planning', 'Team coordination', 'Metrics reporting'], skills: ['ISTQB Advanced', 'JIRA + Zephyr'], allocation: '100%', reportingLine: 'QA Strategy Director' },
          { role: 'Senior Test Engineer', responsibilities: ['Test case design', 'Exploratory testing'], skills: ['Testing techniques', 'API testing'], allocation: '100%', reportingLine: 'QA Lead' },
          { role: 'Automation Engineer', responsibilities: ['Playwright framework', 'CI/CD integration'], skills: ['Playwright TypeScript', 'GitHub Actions'], allocation: '100%', reportingLine: 'QA Lead' },
        ],
        raci: [
          { activity: 'Strategy Approval', responsible: 'QA Strategy Director', accountable: 'VP Engineering', consulted: 'QA Lead, PM', informed: 'All Stakeholders' },
          { activity: 'Test Execution', responsible: 'Test Engineers', accountable: 'QA Lead', consulted: 'Dev Team', informed: 'PM' },
          { activity: 'Release Sign-off', responsible: 'QA Lead', accountable: 'QA Strategy Director', consulted: 'PM', informed: 'All Stakeholders' },
        ],
      },
      objectives: {
        overview: 'Quality vision and measurable outcomes.',
        qualityVision: `Deliver ${productName} at enterprise-grade quality — zero critical defects, validated performance, and security-hardened — to earn user trust and support sustainable release velocity.`,
        objectives: [
          { objective: 'Functional Quality', kpi: 'Test case pass rate', target: '>=95%', measurement: 'Zephyr Scale report', reportingFrequency: 'Daily' },
          { objective: 'Defect Detection', kpi: 'Defects found pre-production', target: '>=85%', measurement: 'JIRA origin tracking', reportingFrequency: 'Post-release' },
          { objective: 'Performance SLA', kpi: 'P95 response time', target: '<2 seconds', measurement: 'k6 report', reportingFrequency: 'End of perf phase' },
          { objective: 'Security', kpi: 'OWASP coverage + CVEs', target: '100% coverage, 0 Critical/High CVEs', measurement: 'ZAP report', reportingFrequency: 'End of sec phase' },
          { objective: 'Accessibility', kpi: 'WCAG 2.1 AA', target: 'Zero critical violations', measurement: 'axe DevTools', reportingFrequency: 'End of a11y phase' },
        ],
        reportingCadence: [
          { report: 'Daily Defect Dashboard', audience: 'QA + Dev Lead', frequency: 'Daily', format: 'JIRA dashboard', owner: 'QA Lead' },
          { report: 'Weekly Progress Report', audience: 'PM + Stakeholders', frequency: 'Weekly', format: 'Confluence + email', owner: 'QA Lead' },
          { report: 'Release Readiness Report', audience: 'All Stakeholders', frequency: 'Pre-release', format: 'Executive PDF', owner: 'QA Strategy Director' },
        ],
      },
      tools: {
        overview: 'Best-in-class tool ecosystem.',
        categories: [
          { category: 'Test Management', primary: 'JIRA + Zephyr Scale', alternative: 'TestRail', rationale: 'Native JIRA integration; unified defect and test tracking', licenceType: 'Commercial', setupRequired: ['Zephyr Scale licence', 'Project configuration', 'Dashboard setup'] },
          { category: 'Test Automation', primary: 'Playwright (TypeScript)', alternative: 'Cypress', rationale: 'Cross-browser; parallel execution; axe integration; strong CI support', licenceType: 'Open Source', setupRequired: ['Node.js 18+', 'Playwright install', 'GitHub Actions'] },
          { category: 'Performance Testing', primary: 'k6 + Grafana', alternative: 'Apache JMeter', rationale: 'Code-first scripts; native Grafana dashboard; Docker CI support', licenceType: 'Open Source', setupRequired: ['k6 binary', 'Grafana Cloud', 'Perf environment'] },
          { category: 'Security Testing', primary: 'OWASP ZAP', alternative: 'Burp Suite Pro', rationale: 'OWASP standard tool; Docker CI integration; A01-A10 coverage', licenceType: 'Open Source', setupRequired: ['ZAP Docker image', 'Network whitelist', 'CI pipeline step'] },
          { category: 'Accessibility Testing', primary: 'axe DevTools', alternative: 'WAVE', rationale: 'Zero false positives; Playwright integration; WCAG 2.1 mapping', licenceType: 'Open Source', setupRequired: ['@axe-core/playwright', 'Playwright fixture'] },
          { category: 'CI/CD', primary: 'GitHub Actions', alternative: 'Jenkins', rationale: 'Native GitHub integration; marketplace actions for all testing tools', licenceType: 'Included in GitHub', setupRequired: ['Workflow YAML files', 'GitHub Secrets', 'Branch protection rules'] },
          { category: 'Reporting', primary: 'Allure Report', alternative: 'ExtentReports', rationale: 'Rich HTML; trend analysis; native Playwright integration; free hosting', licenceType: 'Open Source', setupRequired: ['allure-playwright npm', 'GitHub Pages'] },
        ],
      },
    };
  }
}

export { VALID_GROQ_MODELS };
export default TestStrategyService;
