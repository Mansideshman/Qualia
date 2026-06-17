/**
 * api/jira.js
 * Serverless function for Vercel
 * Proxies JIRA API requests to bypass CORS
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get path from multiple sources
    let path = req.query.path || '';
    
    // If path not in query, try to get it from the rewrite
    if (!path && req.url) {
      // Extract from /api/jira/... URL
      const match = req.url.match(/\/api\/jira\/(.+?)(?:\?|$)/);
      if (match) {
        path = match[1];
      }
    }

    // Handle the case where path is an array
    if (Array.isArray(path)) {
      path = path.join('/');
    }

    console.log('[JIRA API] Path:', path);
    console.log('[JIRA API] URL:', req.url);
    console.log('[JIRA API] Method:', req.method);

    // Get credentials from environment
    const jiraBaseUrl = process.env.REACT_APP_JIRA_BASE_URL;
    const jiraEmail = process.env.REACT_APP_JIRA_EMAIL;
    const jiraToken = process.env.REACT_APP_JIRA_API_TOKEN;

    console.log('[JIRA API] Config Check:');
    console.log('  - URL:', jiraBaseUrl ? '✓ SET' : '✗ MISSING');
    console.log('  - Email:', jiraEmail ? '✓ SET' : '✗ MISSING');
    console.log('  - Token:', jiraToken ? '✓ SET' : '✗ MISSING');

    // Validate credentials
    if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
      console.error('[JIRA API] Missing credentials');
      return res.status(500).json({
        success: false,
        error: 'Missing JIRA configuration in environment variables',
      });
    }

    // Create auth header
    const credentials = `${jiraEmail}:${jiraToken}`;
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

    // Build JIRA endpoint
    let endpoint = '';
    
    if (path === 'validate') {
      endpoint = `${jiraBaseUrl}/rest/api/3/myself`;
    } else if (path && path.startsWith('issue/')) {
      const issueKey = path.replace('issue/', '');
      endpoint = `${jiraBaseUrl}/rest/api/3/issue/${issueKey}?fields=summary,description,type,priority,status,assignee,created,updated`;
    } else if (!path) {
      return res.status(400).json({ 
        error: 'Invalid request: no path provided',
        receivedPath: path,
      });
    } else {
      return res.status(400).json({ 
        error: `Invalid endpoint: ${path}`,
        validEndpoints: ['validate', 'issue/:key'],
      });
    }

    console.log('[JIRA API] Calling:', endpoint);

    // Use global fetch (available in Node 18+)
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[JIRA API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JIRA API] Error response:', response.status, errorText.substring(0, 200));
      
      return res.status(response.status).json({
        success: false,
        isValid: false,
        error: `JIRA error: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    console.log('[JIRA API] Success');

    // Return response based on endpoint
    if (path === 'validate') {
      return res.status(200).json({
        isValid: true,
        success: true,
        user: data.displayName,
        email: data.emailAddress,
      });
    } else if (path?.startsWith('issue/')) {
      return res.status(200).json({
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
    }

  } catch (error) {
    console.error('[JIRA API] Exception:', error.message);
    return res.status(500).json({
      success: false,
      isValid: false,
      error: `Server error: ${error.message}`,
    });
  }
}
