/**
 * api/bugtracker.js
 * Server-side proxy for bug tracker API calls.
 * Avoids CORS issues when calling Jira, YouTrack, Azure DevOps, GitHub, Linear
 * from the browser.
 */

const ALLOWED_PATH_PREFIXES = [
  '/rest/api/',            // Jira Cloud REST API
  '/api/issues',          // YouTrack Issues API
  '/api/admin/',          // YouTrack Admin API
  '/graphql',             // Linear GraphQL
  '/repos/',              // GitHub REST API
  '/_apis/',              // Azure DevOps
];

function isAllowedTarget(rawUrl) {
  try {
    const { protocol, pathname } = new URL(rawUrl);
    if (protocol !== 'https:') return false;
    return ALLOWED_PATH_PREFIXES.some(p => pathname.startsWith(p));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, method = 'POST', headers = {}, body } = req.body || {};

  if (!url) return res.status(400).json({ error: 'Missing url' });
  if (!isAllowedTarget(url)) return res.status(403).json({ error: `Target not allowed: ${url}` });

  try {
    const fetchOpts = { method, headers };
    if (body !== undefined && body !== null) {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const upstream = await fetch(url, fetchOpts);
    const text = await upstream.text();

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
