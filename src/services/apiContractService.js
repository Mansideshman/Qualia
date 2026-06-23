/**
 * apiContractService.js
 * API Contract Forge — AI-powered API Test Suite Generator
 *
 * Upload an OpenAPI/Swagger spec → generates:
 * - Positive path tests (happy path, schema validation)
 * - Negative tests (wrong types, missing required, boundary values)
 * - Auth tests (missing token, expired token, wrong scope)
 * - Contract violation tests (breaking vs non-breaking changes)
 * - OWASP API Top 10 security test cases
 * - Postman collection JSON
 * - Newman runner script (bash)
 * - k6 load test script
 */

const BASE_URL = 'https://api.groq.com/openai/v1';

const FALLBACK_CHAIN = [
  { id: 'llama-3.3-70b-versatile', maxOut: 5000 },
  { id: 'gemma2-9b-it',            maxOut: 5000 },
  { id: 'llama-3.1-8b-instant',    maxOut: 3500 },
];

function parseRetryAfter(errText) {
  const m = errText.match(/try again in ([\dhms.\s]+?)(?:\.|Please|$)/i);
  if (!m) return null;
  const raw = m[1].trim();
  return raw.replace(/(\d+h)(\d)/g, '$1 $2').replace(/(\d+m)(\d)/g, '$1 $2').replace(/\.\d+s/, 's');
}

class APIContractService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /* ── Public entry point ──────────────────────────────── */
  async generateTestSuite({ spec, baseUrl, authType }) {
    try {
      const specInfo = this._summarizeSpec(spec, baseUrl);
      const prompt = this._buildPrompt(specInfo, authType);
      const aiResult = await this._callGroq(prompt);

      if (!aiResult.success) return aiResult;

      let testSuite;
      try {
        testSuite = this._parseTestSuite(aiResult.content);
      } catch (e) {
        return { success: false, error: `Parse error: ${e.message}` };
      }

      const postmanCollection = this._buildPostmanCollection(specInfo, testSuite, authType);
      const newmanScript = this._buildNewmanScript(specInfo.title);
      const k6Script = this._buildK6Script(specInfo, testSuite);

      return {
        success: true,
        specInfo,
        testSuite,
        postmanCollection,
        newmanScript,
        k6Script,
        modelUsed: aiResult.modelUsed,
      };
    } catch (err) {
      return { success: false, error: `API Contract Forge failed: ${err.message}` };
    }
  }

  /* ── Spec summarizer ─────────────────────────────────── */
  _summarizeSpec(spec, overrideBaseUrl) {
    const info = spec.info || {};
    const servers = spec.servers || [];
    const baseUrl = overrideBaseUrl || servers[0]?.url || 'https://api.example.com';
    const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};

    const endpoints = [];
    const paths = spec.paths || {};
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const method of HTTP_METHODS) {
        if (!pathItem[method]) continue;
        const op = pathItem[method];

        let requestBody = null;
        if (op.requestBody) {
          const json = op.requestBody.content?.['application/json'];
          if (json?.schema) requestBody = this._resolveSchema(json.schema, spec);
        }

        const parameters = (op.parameters || pathItem.parameters || []).map(p => ({
          name: p.name,
          in: p.in,
          required: p.required || false,
          type: p.schema?.type || p.type || 'string',
          example: p.example ?? p.schema?.example,
          enum: p.schema?.enum || p.enum,
        }));

        const responses = {};
        for (const [code, resp] of Object.entries(op.responses || {})) {
          const json = resp.content?.['application/json'];
          responses[code] = json?.schema
            ? this._resolveSchema(json.schema, spec)
            : { description: resp.description || '' };
        }

        endpoints.push({
          method: method.toUpperCase(),
          path,
          operationId: op.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          summary: op.summary || op.description || '',
          tags: op.tags || [],
          parameters,
          requestBody,
          responses,
          requiresAuth: !!(op.security?.length || spec.security?.length || Object.keys(securitySchemes).length > 0),
        });
      }
    }

    return {
      title: info.title || 'API Under Test',
      version: info.version || '1.0.0',
      description: info.description || '',
      baseUrl,
      securitySchemes: Object.keys(securitySchemes),
      endpoints,
    };
  }

  _resolveSchema(schema, spec, depth = 0) {
    if (!schema || depth > 2) return {};
    if (schema.$ref) {
      const parts = schema.$ref.replace(/^#\//, '').split('/');
      let node = spec;
      for (const p of parts) node = node?.[p];
      return this._resolveSchema(node, spec, depth + 1);
    }
    if (schema.type === 'array') {
      return { type: 'array', items: this._resolveSchema(schema.items, spec, depth + 1) };
    }
    if (schema.type === 'object' || schema.properties) {
      const fields = {};
      for (const [k, v] of Object.entries(schema.properties || {})) {
        fields[k] = {
          type: v.type || 'any',
          required: (schema.required || []).includes(k),
          example: v.example,
          enum: v.enum,
          format: v.format,
        };
      }
      return { type: 'object', required: schema.required || [], fields };
    }
    return { type: schema.type || 'any', format: schema.format, enum: schema.enum, example: schema.example };
  }

  /* ── Prompt builder ──────────────────────────────────── */
  _buildPrompt(specInfo, authType) {
    const epLines = specInfo.endpoints.slice(0, 12).map(ep => {
      const params = ep.parameters.map(p =>
        `${p.name}(${p.in},${p.required ? 'req' : 'opt'},${p.type}${p.enum ? ',enum:[' + p.enum.slice(0,3).join('|') + ']' : ''})`
      ).join('; ') || 'none';

      const bodyKeys = ep.requestBody?.fields
        ? Object.entries(ep.requestBody.fields).slice(0, 5).map(([k, v]) => `${k}:${v.type}${v.required ? '*' : ''}`).join(',')
        : 'no-body';

      const resCodes = Object.keys(ep.responses).join(',');
      return `${ep.method} ${ep.path} | ${ep.summary || 'no summary'} | params:[${params}] | body:[${bodyKeys}] | res:[${resCodes}]`;
    }).join('\n');

    return `You are a senior API security and test architect. Generate a complete API test suite.

=== API INFO ===
Title: ${specInfo.title} v${specInfo.version}
Base URL: ${specInfo.baseUrl}
Auth: ${authType}
Security schemes: ${specInfo.securitySchemes.join(', ') || 'none'}
Total endpoints: ${specInfo.endpoints.length}

=== ENDPOINTS (up to 12) ===
${epLines}

=== REQUIRED OUTPUT ===
Return ONLY a valid JSON object. No markdown. No code fences. No prose.

{
  "positive": [...],
  "negative": [...],
  "auth": [...],
  "contractViolation": [...],
  "owasp": [...]
}

Each test case — use ONLY these fields (keep values short, no multi-line strings):
{"id":"TC-POS-001","name":"<15 words max>","endpoint":"METHOD /path","category":"positive|negative|auth|contractViolation|owasp","owaspCategory":"API1-BOLA|API2-Broken Auth|API3-Broken Object Property Level Auth|API4-Unrestricted Resource Consumption|API5-BFLA|API6-Unrestricted Access to Sensitive Business Flows|API7-SSRF|API8-Security Misconfiguration|API9-Improper Inventory Management|API10-Unsafe Consumption of APIs|null","priority":"Critical|High|Medium|Low","description":"<20 words max>","requestMethod":"GET|POST|PUT|PATCH|DELETE","requestPath":"/path","expectedStatus":200,"assertions":["<10 words>","<10 words>"],"notes":"<15 words max>"}

=== GENERATION RULES ===
Generate EXACTLY:
- positive: 4 tests — one happy path per main endpoint, schema validation
- negative: 4 tests — wrong type, missing required field, invalid enum, boundary value
- auth: 3 tests — no token, malformed token, IDOR (access another user's resource)
- contractViolation: 3 tests — missing response field, wrong type, breaking status code change
- owasp: 6 tests — cover API1-BOLA, API2-Broken Auth, API3-BOPLA, API5-BFLA, API8-Misconfiguration, API10-Unsafe Consumption

CRITICAL: Keep all string values SHORT. Do not use newlines inside strings. Total response must stay under 5000 tokens.

Return the JSON object now:`;
  }

  /* ── GROQ API call with fallback ─────────────────────── */
  async _callGroq(prompt) {
    let lastRetryAfter = null;
    const rateLimited = [];

    for (const model of FALLBACK_CHAIN) {
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
                content: 'You are a senior API test architect. Return ONLY valid JSON — no markdown, no code fences, no prose.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: model.maxOut,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            lastRetryAfter = parseRetryAfter(errText);
            rateLimited.push(model.id);
            continue;
          }
          if (res.status === 413 || (res.status === 400 && errText.includes('model_decommissioned'))) {
            rateLimited.push(model.id);
            continue;
          }
          return { success: false, error: `GROQ API error ${res.status}: ${errText.substring(0, 300)}` };
        }

        const data = await res.json();
        return {
          success: true,
          content: data.choices[0].message.content,
          modelUsed: model.id,
        };
      } catch (err) {
        return { success: false, error: `Network error: ${err.message}` };
      }
    }

    const retryMsg = lastRetryAfter ? ` Retry after: ${lastRetryAfter}.` : '';
    return {
      success: false,
      isRateLimit: true,
      error: `All AI models are rate-limited.${retryMsg} Tried: ${rateLimited.join(', ')}.`,
    };
  }

  /* ── Response parser (with truncation repair) ───────── */
  _parseTestSuite(content) {
    let cleaned = content.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '');

    const objStart = cleaned.indexOf('{');
    if (objStart === -1) throw new Error('No JSON object found in AI response');
    cleaned = cleaned.slice(objStart);

    // 1. Try clean parse first
    try {
      const objEnd = cleaned.lastIndexOf('}');
      if (objEnd > 0) {
        const parsed = JSON.parse(cleaned.slice(0, objEnd + 1));
        return this._normalizeTestSuite(parsed);
      }
    } catch (_) { /* fall through to repair */ }

    // 2. Repair: extract each category array individually
    return this._repairTestSuite(cleaned);
  }

  _normalizeTestSuite(parsed) {
    return {
      positive:          Array.isArray(parsed.positive)          ? parsed.positive          : [],
      negative:          Array.isArray(parsed.negative)          ? parsed.negative          : [],
      auth:              Array.isArray(parsed.auth)              ? parsed.auth              : [],
      contractViolation: Array.isArray(parsed.contractViolation) ? parsed.contractViolation : [],
      owasp:             Array.isArray(parsed.owasp)             ? parsed.owasp             : [],
    };
  }

  _repairTestSuite(fragment) {
    const cats = ['positive', 'negative', 'auth', 'contractViolation', 'owasp'];
    const result = {};
    for (const cat of cats) {
      result[cat] = this._extractCategoryArray(fragment, cat);
    }
    // Surface a useful error only if nothing at all was extracted
    const total = cats.reduce((n, c) => n + result[c].length, 0);
    if (total === 0) throw new Error('AI response was too truncated to recover any test cases. Please try again.');
    return result;
  }

  _extractCategoryArray(text, key) {
    const keyRe = new RegExp(`"${key}"\\s*:\\s*\\[`);
    const match = keyRe.exec(text);
    if (!match) return [];

    const arrStart = match.index + match[0].length - 1; // position of '['
    let depth = 0, inString = false, escape = false;

    for (let i = arrStart; i < text.length; i++) {
      const c = text[i];
      if (escape)            { escape = false; continue; }
      if (c === '\\' && inString) { escape = true; continue; }
      if (c === '"')         { inString = !inString; continue; }
      if (inString)          continue;
      if (c === '[')         depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(arrStart, i + 1)); } catch (_) { /* repair below */ }
        }
      }
    }

    // Array was truncated — recover all complete objects
    return this._repairArray(text.slice(arrStart));
  }

  _repairArray(fragment) {
    const lastBrace = fragment.lastIndexOf('}');
    if (lastBrace === -1) return [];
    let repaired = fragment.slice(0, lastBrace + 1).trimEnd();
    if (!repaired.startsWith('[')) repaired = '[' + repaired;
    if (repaired.endsWith(',')) repaired = repaired.slice(0, -1);
    repaired += ']';
    try { return JSON.parse(repaired); } catch (_) { return []; }
  }

  /* ── Postman collection builder ──────────────────────── */
  _buildPostmanCollection(specInfo, testSuite, authType) {
    const allTests = [
      ...testSuite.positive,
      ...testSuite.negative,
      ...testSuite.auth,
      ...testSuite.contractViolation,
      ...testSuite.owasp,
    ];

    const FOLDER_NAMES = {
      positive:          '✅ Positive Path Tests',
      negative:          '❌ Negative Tests',
      auth:              '🔐 Auth Tests',
      contractViolation: '📋 Contract Violation Tests',
      owasp:             '🛡️ OWASP API Top 10 Tests',
    };

    const buildItem = (tc) => {
      const rawUrl = `{{baseUrl}}${tc.requestPath || '/'}`;
      const queryParams = Object.entries(tc.requestParams || {}).map(([k, v]) => ({
        key: k,
        value: String(v),
        disabled: false,
      }));

      const headers = Object.entries(tc.requestHeaders || {}).map(([k, v]) => ({
        key: k,
        value: v,
        type: 'text',
      }));

      const body = tc.requestBody && Object.keys(tc.requestBody).length > 0
        ? { mode: 'raw', raw: JSON.stringify(tc.requestBody, null, 2), options: { raw: { language: 'json' } } }
        : { mode: 'none' };

      const testScript = [
        `pm.test("${tc.name} — status ${tc.expectedStatus || 200}", function () {`,
        `  pm.response.to.have.status(${tc.expectedStatus || 200});`,
        `});`,
        '',
        ...(tc.assertions || []).flatMap((a, i) => [
          `pm.test("Assertion ${i + 1}: ${a.replace(/"/g, "'")}", function () {`,
          `  // ${a}`,
          `  pm.expect(pm.response.code).to.be.oneOf([${tc.expectedStatus || 200}, 201, 204]);`,
          `});`,
          '',
        ]),
      ];

      return {
        name: `[${(tc.category || 'TEST').toUpperCase().slice(0, 3)}] ${tc.name}`,
        event: [{
          listen: 'test',
          script: { type: 'text/javascript', exec: testScript },
        }],
        request: {
          method: tc.requestMethod || 'GET',
          header: headers,
          body,
          url: {
            raw: rawUrl + (queryParams.length ? '?' + queryParams.map(q => `${q.key}=${q.value}`).join('&') : ''),
            host: ['{{baseUrl}}'],
            path: (tc.requestPath || '/').split('/').filter(Boolean),
            query: queryParams,
          },
          description: tc.description || '',
        },
      };
    };

    const folders = {};
    for (const tc of allTests) {
      const cat = tc.category || 'positive';
      if (!folders[cat]) folders[cat] = [];
      folders[cat].push(buildItem(tc));
    }

    const authConfig = authType === 'Bearer Token' || authType === 'OAuth2'
      ? { type: 'bearer', bearer: [{ key: 'token', value: '{{authToken}}', type: 'string' }] }
      : authType === 'API Key'
      ? { type: 'apikey', apikey: [{ key: 'key', value: 'X-API-Key' }, { key: 'value', value: '{{apiKey}}' }, { key: 'in', value: 'header' }] }
      : authType === 'Basic Auth'
      ? { type: 'basic', basic: [{ key: 'username', value: '{{username}}' }, { key: 'password', value: '{{password}}' }] }
      : { type: 'noauth' };

    return {
      info: {
        name: `${specInfo.title} — API Contract Forge`,
        description: `Auto-generated by Qualia API Contract Forge\nAPI: ${specInfo.title} v${specInfo.version}\nBase URL: ${specInfo.baseUrl}\nGenerated: ${new Date().toISOString()}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: authConfig,
      variable: [
        { key: 'baseUrl', value: specInfo.baseUrl, type: 'string' },
        { key: 'authToken', value: '<your-bearer-token>', type: 'string' },
        { key: 'apiKey', value: '<your-api-key>', type: 'string' },
        { key: 'username', value: '<username>', type: 'string' },
        { key: 'password', value: '<password>', type: 'string' },
      ],
      item: Object.entries(FOLDER_NAMES)
        .filter(([cat]) => folders[cat]?.length > 0)
        .map(([cat, name]) => ({
          name,
          item: folders[cat],
          description: `${folders[cat].length} test case(s) for ${cat} scenarios`,
        })),
    };
  }

  /* ── Newman runner script ────────────────────────────── */
  _buildNewmanScript(title) {
    return `#!/bin/bash
# ============================================================
# Newman API Contract Test Runner
# API: ${title}
# Generated by Qualia API Contract Forge
# ============================================================
# Prerequisites: Node.js >= 14
# Install: npm install -g newman newman-reporter-htmlextra
# Usage:   bash run-newman.sh [qa|staging|prod]
# ============================================================

set -euo pipefail

COLLECTION="./postman-collection.json"
ENV=\${1:-"qa"}
ENV_FILE="./env/\${ENV}.json"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="./reports/\${TIMESTAMP}"

mkdir -p "$REPORT_DIR"

echo "========================================"
echo " Newman Runner — ${title}"
echo "========================================"
echo " Collection : $COLLECTION"
echo " Environment: $ENV"
echo " Reports    : $REPORT_DIR"
echo "========================================"

# Check newman is installed
if ! command -v newman &> /dev/null; then
  echo "Installing Newman + HTML reporter..."
  npm install -g newman newman-reporter-htmlextra
fi

# Run tests
newman run "$COLLECTION" \\
  \${ENV_FILE:+--environment "$ENV_FILE"} \\
  --reporters cli,htmlextra,json \\
  --reporter-htmlextra-export "$REPORT_DIR/report.html" \\
  --reporter-htmlextra-title "${title} Test Report" \\
  --reporter-json-export "$REPORT_DIR/results.json" \\
  --timeout-request 15000 \\
  --delay-request 300 \\
  --iteration-count 1 \\
  2>&1 | tee "$REPORT_DIR/console.log"

EXIT=$?

echo ""
echo "========================================"
echo " Results"
echo "========================================"
echo " HTML Report : $REPORT_DIR/report.html"
echo " JSON Results: $REPORT_DIR/results.json"

if [ $EXIT -ne 0 ]; then
  echo " Status      : FAILED"
  exit 1
fi

echo " Status      : PASSED"
exit 0
`;
  }

  /* ── k6 load test script ─────────────────────────────── */
  _buildK6Script(specInfo, testSuite) {
    const posTests = testSuite.positive.slice(0, 6);

    const scenarios = posTests.map(tc => {
      const method = (tc.requestMethod || 'GET').toLowerCase();
      const path = tc.requestPath || '/';
      const url = `\`\${BASE_URL}${path}\``;

      if (method === 'get') {
        return `  // ${tc.name}
  res = http.get(${url}, { headers });
  checkAndRecord(res, '${tc.name.replace(/'/g, "\\'")}', ${tc.expectedStatus || 200});
  sleep(THINK_TIME);`;
      }
      const bodyStr = tc.requestBody && Object.keys(tc.requestBody).length > 0
        ? 'JSON.stringify(' + JSON.stringify(tc.requestBody) + ')'
        : 'null';
      return `  // ${tc.name}
  res = http.${method}(${url}, ${bodyStr}, { headers });
  checkAndRecord(res, '${tc.name.replace(/'/g, "\\'")}', ${tc.expectedStatus || 200});
  sleep(THINK_TIME);`;
    }).join('\n\n');

    return `import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================
// k6 Load Test — ${specInfo.title}
// Generated by Qualia API Contract Forge
// ============================================================
// Prerequisites: k6 >= 0.38
// Install: https://k6.io/docs/getting-started/installation/
// Usage:
//   k6 run k6-load-test.js
//   k6 run --env API_TOKEN=mytoken k6-load-test.js
//   k6 run --env BASE_URL=https://staging.example.com k6-load-test.js
// ============================================================

const BASE_URL = __ENV.BASE_URL || '${specInfo.baseUrl}';
const AUTH_TOKEN = __ENV.API_TOKEN || '<replace-with-your-token>';
const THINK_TIME = 0.5; // seconds between requests

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '1m',  target: 50  },
    { duration: '30s', target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'http_req_duration':      ['p(95)<500', 'p(99)<1000'],
    'http_req_failed':        ['rate<0.01'],
    'errors':                 ['rate<0.05'],
    'api_duration':           ['p(95)<500'],
  },
};

function checkAndRecord(res, name, expectedStatus) {
  const ok = check(res, {
    [\`[\${name}] status is \${expectedStatus}\`]: (r) => r.status === expectedStatus,
    [\`[\${name}] response time < 500ms\`]:       (r) => r.timings.duration < 500,
    [\`[\${name}] has response body\`]:            (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': \`Bearer \${AUTH_TOKEN}\`,
  };

  let res;

  group('${specInfo.title} — Happy Path', function () {
${scenarios || `    // No positive test cases extracted — add your endpoints here
    res = http.get(\`\${BASE_URL}/health\`, { headers });
    checkAndRecord(res, 'health check', 200);
    sleep(THINK_TIME);`}
  });
}

export function handleSummary(data) {
  const dur = data.metrics.http_req_duration?.values || {};
  const failed = data.metrics.http_req_failed?.values || {};
  const reqs = data.metrics.http_reqs?.values || {};

  return {
    'k6-summary.json': JSON.stringify(data, null, 2),
    stdout: \`
╔══════════════════════════════════════════════╗
║  ${specInfo.title} — Load Test Summary
╠══════════════════════════════════════════════╣
║  Total Requests : \${reqs.count || 0}
║  Failed Rate    : \${((failed.rate || 0) * 100).toFixed(2)}%
║  Avg Duration   : \${(dur.avg || 0).toFixed(2)}ms
║  P95 Duration   : \${(dur['p(95)'] || 0).toFixed(2)}ms
║  P99 Duration   : \${(dur['p(99)'] || 0).toFixed(2)}ms
╚══════════════════════════════════════════════╝
\`,
  };
}
`;
  }
}

export default APIContractService;
