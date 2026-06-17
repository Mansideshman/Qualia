#!/usr/bin/env node

/**
 * Phase 2: Link - API Connectivity & Authentication Verification
 * Tests JIRA API and GROQ API connectivity
 * Usage: node connectivity-test.js
 */

require('dotenv').config();
const https = require('https');

// ===== CONFIGURATION =====
const JIRA_CONFIG = {
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  issueId: process.env.TEST_ISSUE_ID || 'VWO-48',
};

const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
};

// ===== UTILITIES =====
const log = {
  info: (msg) => console.log(`\n ℹ️  ${msg}`),
  success: (msg) => console.log(`\n ✅ ${msg}`),
  error: (msg) => console.log(`\n ❌ ${msg}`),
  warn: (msg) => console.log(`\n ⚠️  ${msg}`),
  section: (title) => console.log(`\n\n ${'='.repeat(60)}\n ${title}\n ${'='.repeat(60)}`),
};

// ===== VALIDATION =====
function validateConfiguration() {
  log.section('Phase 2: Credential Validation');

  const errors = [];

  if (!JIRA_CONFIG.baseUrl) errors.push('❌ JIRA_BASE_URL not set');
  if (!JIRA_CONFIG.email) errors.push('❌ JIRA_EMAIL not set');
  if (!JIRA_CONFIG.token) errors.push('❌ JIRA_API_TOKEN not set');
  if (!GROQ_CONFIG.apiKey) errors.push('❌ GROQ_API_KEY not set');

  if (errors.length > 0) {
    log.warn('Missing Configuration:');
    errors.forEach((e) => console.log(` ${e}`));
    console.log(
      `\n📋 Create a .env file in the project root with the required variables.`
    );
    console.log(`📄 Reference: .env.template\n`);
    process.exit(1);
  }

  log.success('All required credentials are configured');
}

// ===== JIRA CONNECTIVITY TEST =====
async function testJiraConnectivity() {
  log.section('Phase 2.1: JIRA API Connectivity Test');

  return new Promise((resolve) => {
    try {
      // Parse URL
      const url = new URL(`${JIRA_CONFIG.baseUrl}/rest/api/3/issue/${JIRA_CONFIG.issueId}`);
      const auth = Buffer.from(`${JIRA_CONFIG.email}:${JIRA_CONFIG.token}`).toString('base64');

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      };

      log.info(`Testing JIRA endpoint: ${url.href}`);
      log.info(`Issue ID: ${JIRA_CONFIG.issueId}`);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const issue = JSON.parse(data);
              log.success(`JIRA connectivity verified ✓`);
              log.info(`Issue Key: ${issue.key}`);
              log.info(`Summary: ${issue.fields.summary}`);
              log.info(`Description Preview: ${issue.fields.description?.substring(0, 100) || 'N/A'}...`);

              resolve({
                status: 'success',
                issue: {
                  key: issue.key,
                  summary: issue.fields.summary,
                  description: issue.fields.description,
                  type: issue.fields.issuetype?.name,
                  priority: issue.fields.priority?.name,
                },
              });
            } catch (e) {
              log.error(`Failed to parse JIRA response: ${e.message}`);
              resolve({ status: 'error', error: e.message });
            }
          } else {
            log.error(`JIRA API returned status ${res.statusCode}`);
            log.warn(`Response: ${data.substring(0, 200)}`);
            resolve({ status: 'error', statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (error) => {
        log.error(`JIRA connection failed: ${error.message}`);
        resolve({ status: 'error', error: error.message });
      });

      req.end();
    } catch (error) {
      log.error(`JIRA test error: ${error.message}`);
      resolve({ status: 'error', error: error.message });
    }
  });
}

// ===== GROQ CONNECTIVITY TEST =====
async function testGroqConnectivity() {
  log.section('Phase 2.2: GROQ API Connectivity Test');

  return new Promise((resolve) => {
    try {
      const testPayload = {
        model: GROQ_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: 'Respond with: "GROQ API connectivity verified"',
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      };

      const url = new URL('https://api.groq.com/openai/v1/chat/completions');

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      log.info(`Testing GROQ endpoint: ${url.href}`);
      log.info(`Model: ${GROQ_CONFIG.model}`);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              const content = response.choices?.[0]?.message?.content || '';
              log.success(`GROQ connectivity verified ✓`);
              log.info(`Response: ${content}`);
              log.info(`Tokens used: ${response.usage?.total_tokens || 'N/A'}`);

              resolve({
                status: 'success',
                response: content,
                usage: response.usage,
              });
            } catch (e) {
              log.error(`Failed to parse GROQ response: ${e.message}`);
              resolve({ status: 'error', error: e.message });
            }
          } else {
            log.error(`GROQ API returned status ${res.statusCode}`);
            log.warn(`Response: ${data.substring(0, 200)}`);
            resolve({ status: 'error', statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (error) => {
        log.error(`GROQ connection failed: ${error.message}`);
        resolve({ status: 'error', error: error.message });
      });

      req.write(JSON.stringify(testPayload));
      req.end();
    } catch (error) {
      log.error(`GROQ test error: ${error.message}`);
      resolve({ status: 'error', error: error.message });
    }
  });
}

// ===== MAIN EXECUTION =====
async function main() {
  console.log('\n🔗 PHASE 2: LINK - Connectivity & Authentication Verification\n');

  validateConfiguration();

  const jiraResult = await testJiraConnectivity();
  const groqResult = await testGroqConnectivity();

  // ===== RESULTS SUMMARY =====
  log.section('Phase 2: Test Results Summary');

  const allPassed =
    jiraResult.status === 'success' && groqResult.status === 'success';

  if (allPassed) {
    log.success(`✓ All connectivity tests passed!`);
    console.log(`
 📊 Summary:
   ✅ JIRA API: Connected
   ✅ GROQ API: Connected
   ✅ Authentication: Verified

 Ready for Phase 3: Architect
    `);
  } else {
    log.error(`❌ Some tests failed. Please review the errors above.`);
    console.log(`
 📊 Summary:
   ${jiraResult.status === 'success' ? '✅' : '❌'} JIRA API
   ${groqResult.status === 'success' ? '✅' : '❌'} GROQ API

 Fix the errors and rerun: node connectivity-test.js
    `);
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
