/**
 * defectRadarService.js
 * B.L.A.S.T. — Defect Radar AI Engine
 * RICE-POT Framework: Risks · Items · Criteria · Environment · People · Objectives · Tools
 *
 * Supports: screenshot, log file, HAR file, text description
 * Vision model used when images are uploaded; text model for text-only analysis
 */

const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview',
];

const TEXT_MODEL = 'llama-3.3-70b-versatile';
const BASE_URL   = 'https://api.groq.com/openai/v1';

class DefectRadarService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /* ── Public entry point ─────────────────────────────── */
  async analyseEvidence({ textDescription, appContext, textFileContents, imageBase64List }) {
    const hasImages = imageBase64List && imageBase64List.length > 0;
    const model     = hasImages ? VISION_MODELS[0] : TEXT_MODEL;

    const systemPrompt = this._buildSystemPrompt();
    const userContent  = this._buildUserContent({
      textDescription,
      appContext,
      textFileContents,
      imageBase64List,
      hasImages,
    });

    try {
      const raw = await this._callAPI(model, systemPrompt, userContent, hasImages);
      if (!raw.success) return { success: false, error: raw.error };
      return { success: true, result: this._parse(raw.content, appContext) };
    } catch (err) {
      return { success: false, error: `Defect Radar analysis failed: ${err.message}` };
    }
  }

  /* ── System prompt ──────────────────────────────────── */
  _buildSystemPrompt() {
    return `You are the B.L.A.S.T. Bug Intelligence Agent — a senior QA engineer and software forensic analyst specializing in detecting, diagnosing, and reporting defects across web, desktop, mobile, and enterprise applications.

You operate under the RICE-POT framework:
R = Risks (severity, user impact, security exposure)
I = Items (affected component, module, feature, API endpoint)
C = Criteria (exact reproduction steps, fix acceptance criteria)
E = Environment (browser, OS, device, app version, network)
P = People (reporter, suggested assignee, affected persona)
O = Objectives (expected vs actual behaviour, business rule violated)
T = Tools (evidence analysed, debugging tools, regression test tools)

RULES:
- Return ONLY valid JSON. No markdown. No code fences. No prose before or after.
- Detect ALL bugs, UX issues, performance degradations, and security concerns visible in the evidence
- Each finding gets its own complete RICE-POT ticket
- Root Cause MUST state the probable technical layer
- Titles follow: "[Component] — [Observable symptom in active voice]"
- Steps to reproduce must be atomic, precise, developer-ready
- Mark uncertain fields "[NEEDS DEVELOPER INPUT]" — never fabricate facts
- If evidence shows a screenshot/image, describe what you see and derive bugs from visual anomalies`;
  }

  /* ── User message content ───────────────────────────── */
  _buildUserContent({ textDescription, appContext, textFileContents, imageBase64List, hasImages }) {
    const ctx = appContext || {};
    const today = new Date().toISOString().split('T')[0];

    const contextBlock = `
APPLICATION CONTEXT:
- Application Name: ${ctx.appName || 'Not provided'}
- Application Type: ${ctx.appType || 'Web Application (Browser)'}
- URL / Identifier: ${ctx.appUrl || 'Not provided'}
- Environment: ${ctx.environment || 'Not provided'}
- Browser / Client: ${ctx.browser || 'Not provided'}
- Operating System: ${ctx.os || 'Not provided'}
- User Role: ${ctx.userRole || 'Not provided'}
- Screen Resolution: ${ctx.resolution || 'Not provided'}
- App Version / Build: ${ctx.appVersion || 'Not provided'}

WHAT THE USER WAS DOING:
${textDescription?.whatDoing || 'Not provided'}

EXPECTED BEHAVIOUR:
${textDescription?.expected || 'Not provided'}

ACTUAL BEHAVIOUR (THE PROBLEM):
${textDescription?.actual || 'Not provided'}

ADDITIONAL CONTEXT:
${textDescription?.additional || 'None'}

ANALYSIS DATE: ${today}`;

    const fileBlock = textFileContents && textFileContents.length > 0
      ? `\n\nATTACHED FILE CONTENTS:\n${textFileContents.map((f, i) =>
          `--- FILE ${i + 1}: ${f.name} ---\n${f.content.substring(0, 3000)}${f.content.length > 3000 ? '\n[...truncated...]' : ''}`
        ).join('\n\n')}`
      : '';

    const instructionBlock = `

INSTRUCTIONS:
1. Analyse ALL provided evidence (text, files, and ${hasImages ? 'images' : 'description'})
2. Detect every bug, UX issue, performance concern, and security observation
3. Perform RICE-POT root cause analysis for each finding
4. Return this exact JSON structure:

{
  "analysis": {
    "evidenceSummary": "what was provided and analysed",
    "totalBugsDetected": 0,
    "criticalCount": 0,
    "highCount": 0,
    "mediumCount": 0,
    "lowCount": 0,
    "analysisConfidence": "High | Medium | Low",
    "analysisNotes": "any limitations of analysis due to evidence quality"
  },
  "tickets": [
    {
      "ticketId": "DR-001",
      "ticketType": "Bug | Improvement | Task | Security Vulnerability | Performance Issue | UX Issue",
      "title": "[Component] — [Symptom in active voice, max 80 chars]",
      "severity": "Critical | High | Medium | Low",
      "priority": "P0 | P1 | P2 | P3",
      "risks": {
        "userImpact": "who is affected and how severely",
        "businessImpact": "revenue/compliance/reputation/data impact",
        "securityRisk": "None | describe if applicable",
        "dataLossRisk": "Yes/No and explanation",
        "workaround": "any workaround or None"
      },
      "items": {
        "feature": "name of the feature where bug occurs",
        "module": "module or service name",
        "pageOrScreen": "URL path or screen name",
        "apiEndpoint": "HTTP method + endpoint if applicable",
        "component": "specific UI or backend component"
      },
      "criteria": {
        "reproducibility": "Always | Intermittent | Rare",
        "stepsToReproduce": ["Step 1", "Step 2", "Step N"],
        "preconditions": ["Precondition 1", "Precondition 2"],
        "triggerCondition": "the exact action that triggers the bug",
        "fixAcceptanceCriteria": ["AC 1", "AC 2", "AC 3"]
      },
      "environment": {
        "applicationType": "Web (Browser) | Desktop | Mobile",
        "applicationUrl": "URL or identifier",
        "browser": "browser and version",
        "operatingSystem": "OS and version",
        "device": "device type",
        "userRole": "user role",
        "testEnvironment": "Production | Staging | QA | Dev"
      },
      "people": {
        "reportedBy": "B.L.A.S.T. Defect Radar (AI)",
        "suggestedAssignee": "team responsible for affected component",
        "affectedPersona": "which user type is impacted",
        "escalateTo": "role to escalate P0/Critical to"
      },
      "objectives": {
        "expectedBehaviour": "what should happen",
        "actualBehaviour": "what is happening",
        "businessRuleViolated": "which requirement or rule is broken",
        "delta": "one sentence: exact difference between expected and actual"
      },
      "tools": {
        "evidenceUsed": ["Screenshot", "Log file", "Text description"],
        "screenshotObservation": "what is visible in the provided evidence",
        "suggestedDebuggingSteps": ["DevTools > Network", "Check console for errors"],
        "suggestedTestTools": ["Playwright for regression", "Postman for API validation"]
      },
      "rootCause": {
        "probableLayer": "FRONTEND:UI-STATE | API:API-CONTRACT | DATABASE:DB-QUERY | AUTH:AUTH-SESSION | INTEGRATION:INT-THIRD_PARTY | CONFIGURATION:CONFIG-ENV | NETWORK:NET-CORS",
        "summary": "2-3 sentence forensic explanation of why this bug occurs",
        "technicalHypothesis": "specific code-level hypothesis",
        "confidenceLevel": "High (>80%) | Medium (50-80%) | Low (<50%)",
        "investigationRequired": ["check specific file/function", "confirm assumption"]
      },
      "additionalDetails": {
        "remark": "any additional observations",
        "estimatedFixEffort": "XS (<1h) | S (1-4h) | M (4-8h) | L (1-2d) | XL (>2d)",
        "releaseNoteRequired": "Yes | No",
        "regression": "Was this working before? Last known good version if known"
      },
      "jiraFields": {
        "issueType": "Bug | Story | Task",
        "priority": "Blocker | Critical | Major | Minor | Trivial",
        "labels": ["ai-detected", "ricepot", "component-label"],
        "storyPoints": 3
      }
    }
  ],
  "recommendations": {
    "immediateActions": ["action 1", "action 2"],
    "preventiveMeasures": ["how to prevent this class of bug"],
    "testingGaps": ["what test coverage is missing"],
    "architectureNotes": ["structural improvements to prevent recurrence"]
  }
}

Return ONLY valid JSON. No markdown. No code fences.`;

    if (hasImages) {
      return [
        { type: 'text', text: contextBlock + fileBlock + instructionBlock },
        ...imageBase64List.map((img) => ({
          type: 'image_url',
          image_url: { url: img.dataUrl },
        })),
      ];
    }

    return contextBlock + fileBlock + instructionBlock;
  }

  /* ── GROQ API call ──────────────────────────────────── */
  async _callAPI(model, systemPrompt, userContent, hasImages) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ];

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 6000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        // Fall back to text model if vision model fails
        if (hasImages && errText.includes('model')) {
          return this._callAPI(VISION_MODELS[1], systemPrompt, userContent, false);
        }
        return { success: false, error: `GROQ API error ${response.status}: ${errText.substring(0, 300)}` };
      }

      const data = await response.json();
      return { success: true, content: data.choices[0].message.content };
    } catch (err) {
      return { success: false, error: `API call failed: ${err.message}` };
    }
  }

  /* ── Parse response ─────────────────────────────────── */
  _parse(content, appContext) {
    try {
      let cleaned = content.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '');

      const start = cleaned.indexOf('{');
      const end   = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');

      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
        appContext,
      };
    } catch (err) {
      console.error('Parse error, using fallback:', err.message);
      return this._fallback(appContext);
    }
  }

  /* ── Fallback result ────────────────────────────────── */
  _fallback(appContext) {
    const ctx = appContext || {};
    return {
      generatedAt: new Date().toISOString(),
      appContext: ctx,
      analysis: {
        evidenceSummary: 'Analysis completed with available evidence.',
        totalBugsDetected: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        analysisConfidence: 'Medium',
        analysisNotes: 'Response parsing encountered an issue. Showing template ticket.',
      },
      tickets: [{
        ticketId: 'DR-001',
        ticketType: 'Bug',
        title: `${ctx.appName || 'Application'} — Defect detected in provided evidence`,
        severity: 'High',
        priority: 'P1',
        risks: { userImpact: 'Affects user workflow', businessImpact: 'TBD', securityRisk: 'None', dataLossRisk: 'No', workaround: 'None identified' },
        items: { feature: ctx.appName || 'TBD', module: 'TBD', pageOrScreen: ctx.appUrl || 'TBD', apiEndpoint: 'TBD', component: 'TBD' },
        criteria: {
          reproducibility: 'Intermittent',
          stepsToReproduce: ['Step 1: Navigate to the affected page', 'Step 2: Perform the action that triggers the issue', 'Step 3: Observe the defect'],
          preconditions: ['User is authenticated', 'Application is accessible'],
          triggerCondition: 'See provided evidence',
          fixAcceptanceCriteria: ['Issue no longer reproducible', 'No new console errors', 'Regression suite passes'],
        },
        environment: { applicationType: ctx.appType || 'Web (Browser)', applicationUrl: ctx.appUrl || 'TBD', browser: ctx.browser || 'TBD', operatingSystem: ctx.os || 'TBD', device: 'Desktop', userRole: ctx.userRole || 'TBD', testEnvironment: ctx.environment || 'TBD' },
        people: { reportedBy: 'B.L.A.S.T. Defect Radar (AI)', suggestedAssignee: 'Development Team', affectedPersona: 'All users', escalateTo: 'Tech Lead' },
        objectives: { expectedBehaviour: 'Application should function as per requirements', actualBehaviour: 'Defect observed in provided evidence', businessRuleViolated: 'TBD', delta: 'Actual behaviour deviates from expected behaviour' },
        tools: { evidenceUsed: ['Provided by user'], screenshotObservation: 'See attached evidence', suggestedDebuggingSteps: ['Check browser console for errors', 'Review network tab for failed requests'], suggestedTestTools: ['Playwright for regression', 'Browser DevTools'] },
        rootCause: { probableLayer: 'FRONTEND:UI-STATE', summary: 'Root cause requires further investigation based on provided evidence.', technicalHypothesis: '[NEEDS DEVELOPER INPUT]', confidenceLevel: 'Low (<50%)', investigationRequired: ['Review the affected component', 'Check API responses for the affected flow'] },
        additionalDetails: { remark: 'Auto-generated fallback ticket. Please re-run with more detailed evidence.', estimatedFixEffort: 'M (4-8h)', releaseNoteRequired: 'No', regression: 'Unknown' },
        jiraFields: { issueType: 'Bug', priority: 'Major', labels: ['ai-detected', 'ricepot', 'needs-investigation'], storyPoints: 3 },
      }],
      recommendations: {
        immediateActions: ['Investigate the defect with developer', 'Attach additional evidence (screenshots, logs) for better analysis'],
        preventiveMeasures: ['Add automated test coverage for this flow'],
        testingGaps: ['Missing automated regression for this feature'],
        architectureNotes: ['Review component error handling'],
      },
    };
  }
}

export default DefectRadarService;
