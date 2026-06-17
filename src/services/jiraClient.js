/**
 * jiraClient.js
 * Direct Jira Cloud REST API client (no proxy needed).
 * Note: Jira Cloud allows CORS for authenticated requests.
 * If the user's Jira instance blocks CORS, we surface a clear message.
 */

class JiraClient {
  constructor(baseUrl, email, apiToken) {
    this.baseUrl  = (baseUrl || '').replace(/\/$/, '');
    this.email    = email    || '';
    this.apiToken = apiToken || '';
  }

  get authHeader() {
    return `Basic ${btoa(`${this.email}:${this.apiToken}`)}`;
  }

  /* Validate credentials by calling /rest/api/3/myself */
  async validateCredentials() {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      return { isValid: false, error: 'Base URL, email and API token are all required.' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      /* Check content-type before parsing — a HTML response means CORS/redirect */
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          isValid: false,
          error:
            'Server returned HTML instead of JSON. ' +
            'Jira Cloud may be blocking the browser request due to CORS. ' +
            'Try using the Defect Radar export (JSON) and import into Jira instead.',
        };
      }

      const data = await res.json();

      if (res.status === 401) return { isValid: false, error: 'Invalid credentials — check your email and API token.' };
      if (res.status === 403) return { isValid: false, error: 'Access denied — verify the API token has the required scopes.' };
      if (!res.ok)            return { isValid: false, error: `Jira returned HTTP ${res.status}: ${data.message || 'Unknown error'}` };

      return { isValid: true, user: data.displayName, email: data.emailAddress };

    } catch (err) {
      /* Network or CORS error */
      if (
        err.message.includes('DOCTYPE') ||
        err.message.includes('JSON') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Failed to fetch')
      ) {
        return {
          isValid: false,
          error:
            'CORS policy blocked the request — your browser cannot reach Jira Cloud directly from localhost. ' +
            'This is a browser security restriction, not a credentials issue. ' +
            'Your credentials are saved. Use the Jira JSON export in Defect Radar to import tickets manually.',
        };
      }
      return { isValid: false, error: `Connection error: ${err.message}` };
    }
  }

  /* Fetch a single Jira issue */
  async fetchIssue(issueKey) {
    if (!issueKey || typeof issueKey !== 'string') {
      return { success: false, error: 'Invalid issue key' };
    }
    try {
      const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { success: false, error: 'CORS blocked — Jira Cloud cannot be reached from the browser directly.' };
      }

      const data = await res.json();
      if (!res.ok) {
        const msg = data.errorMessages?.[0] || Object.values(data.errors || {})[0] || `HTTP ${res.status}`;
        return { success: false, error: msg };
      }

      return {
        success: true,
        issue: {
          key:         data.key,
          summary:     data.fields?.summary     || '',
          description: data.fields?.description || '',
          issuetype:   data.fields?.issuetype?.name || 'Bug',
          status:      data.fields?.status?.name    || '',
          priority:    data.fields?.priority?.name  || '',
          assignee:    data.fields?.assignee?.displayName || '',
          labels:      data.fields?.labels           || [],
        },
      };
    } catch (err) {
      return { success: false, error: `Error fetching issue: ${err.message}` };
    }
  }
}

export default JiraClient;
