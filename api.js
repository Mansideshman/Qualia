/**
 * api.js
 * Simple Express backend to proxy JIRA API calls
 * Bypasses CORS restrictions
 */

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        process.env[key.trim()] = value.trim();
      }
    });
}

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// JIRA config
const JIRA_BASE_URL = process.env.REACT_APP_JIRA_BASE_URL;
const JIRA_EMAIL = process.env.REACT_APP_JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.REACT_APP_JIRA_API_TOKEN;

function getAuthHeader() {
  const credentials = `${JIRA_EMAIL}:${JIRA_API_TOKEN}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// Proxy endpoint for JIRA issue
app.post('/api/jira/issue/:key', async (req, res) => {
  try {
    const issueKey = req.params.key;
    const url = `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}?fields=summary,description,type,priority,status,assignee,created,updated`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `JIRA API error: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    res.json({
      success: true,
      issue: {
        key: data.key,
        summary: data.fields.summary,
        description: data.fields.description?.content?.[0]?.content?.[0]?.text || 'No description',
        type: data.fields.type?.name || 'Unknown',
        priority: data.fields.priority?.name || 'No Priority',
        status: data.fields.status?.name || 'Unknown',
        assignee: data.fields.assignee?.displayName || 'Unassigned',
        created: data.fields.created,
        updated: data.fields.updated,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  }
});

// Proxy endpoint for JIRA validation
app.get('/api/jira/validate', async (req, res) => {
  try {
    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        isValid: false,
        error: `JIRA authentication failed: ${response.status}`,
      });
    }

    const data = await response.json();
    res.json({
      isValid: true,
      user: data.displayName,
      email: data.emailAddress,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      isValid: false,
      error: `Server error: ${error.message}`,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ API server running on port ${PORT}`);
  console.log(`📍 JIRA Base URL: ${JIRA_BASE_URL}`);
  console.log(`👤 JIRA Email: ${JIRA_EMAIL}`);
});
