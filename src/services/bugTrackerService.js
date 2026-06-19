/**
 * bugTrackerService.js
 * B.L.A.S.T. — Bug Tracker Integration
 * Supported: Jira Cloud · YouTrack · Linear · GitHub Issues · Azure DevOps
 */

export const BT_TOOLS = {
  jira: {
    id: 'jira', name: 'Jira', icon: '🎯', color: '#0052cc',
    fields: [
      { key: 'baseUrl',    label: 'Jira Base URL',                 placeholder: 'https://yourorg.atlassian.net',           type: 'url',      hint: 'Your Atlassian domain' },
      { key: 'email',      label: 'Email',                          placeholder: 'you@company.com',                         type: 'email',    hint: 'Atlassian account email' },
      { key: 'apiToken',   label: 'API Token',                      placeholder: 'Paste Atlassian API token',               type: 'password', hint: 'Create at id.atlassian.com/manage-profile/security/api-tokens' },
      { key: 'projectKey', label: 'Project Key',                    placeholder: 'e.g., PROJ',                              type: 'text',     hint: 'Project key shown in issue IDs (e.g., QA, BUG, PROJ)' },
      { key: 'assigneeId', label: 'Assignee Account ID (optional)', placeholder: 'e.g., 5b10ac2844c20165700ede21g',         type: 'text',     hint: 'Atlassian accountId from profile URL. Leave blank for project default.' },
      { key: 'component',  label: 'Component (optional)',           placeholder: 'e.g., Frontend, Payments API',            type: 'text',     hint: 'Jira component name. Leave blank if not configured.' },
    ],
  },
  youtrack: {
    id: 'youtrack', name: 'YouTrack', icon: '🔷', color: '#007ECC',
    fields: [
      { key: 'baseUrl',   label: 'YouTrack URL',                 placeholder: 'https://yourorg.youtrack.cloud',  type: 'url',      hint: 'Your YouTrack instance URL' },
      { key: 'token',     label: 'Permanent Token',              placeholder: 'Paste your permanent token',      type: 'password', hint: 'Profile > Account Security > Tokens' },
      { key: 'projectId', label: 'Project Short Name',           placeholder: 'e.g., MYAPP',                    type: 'text',     hint: 'Short name shown in issue IDs (before the dash)' },
      { key: 'assignee',  label: 'Assignee Login (optional)',    placeholder: 'e.g., john.smith',               type: 'text',     hint: 'YouTrack login/username. Leave blank for unassigned.' },
    ],
  },
  linear: {
    id: 'linear', name: 'Linear', icon: '📐', color: '#5E6AD2',
    fields: [
      { key: 'apiKey',     label: 'API Key',                       placeholder: 'lin_api_...',              type: 'password', hint: 'Settings > API > Personal API keys' },
      { key: 'teamId',     label: 'Team ID',                       placeholder: 'Paste Linear Team UUID',   type: 'text',     hint: 'Settings > Teams > (your team) > copy ID' },
      { key: 'assigneeId', label: 'Assignee Member ID (optional)', placeholder: 'Paste member UUID',        type: 'text',     hint: 'Settings > Members > click member > copy ID. Leave blank for unassigned.' },
    ],
  },
  github: {
    id: 'github', name: 'GitHub Issues', icon: '🐙', color: '#24292F',
    fields: [
      { key: 'token',    label: 'Personal Access Token',              placeholder: 'ghp_...',           type: 'password', hint: 'Settings > Developer settings > Personal access tokens (issues:write scope)' },
      { key: 'owner',    label: 'Repo Owner',                         placeholder: 'e.g., your-org',   type: 'text',     hint: 'Organisation or username' },
      { key: 'repo',     label: 'Repository',                         placeholder: 'e.g., my-project', type: 'text',     hint: 'Repository name (without owner prefix)' },
      { key: 'assignee', label: 'Assignee GitHub Username (optional)', placeholder: 'e.g., johndoe',   type: 'text',     hint: 'GitHub username — must be a repo collaborator. Leave blank for unassigned.' },
    ],
  },
  azuredevops: {
    id: 'azuredevops', name: 'Azure DevOps', icon: '🔵', color: '#0078d4',
    fields: [
      { key: 'organization', label: 'Organization',              placeholder: 'e.g., mycompany',         type: 'text',     hint: 'dev.azure.com/{organization}' },
      { key: 'project',      label: 'Project Name',              placeholder: 'e.g., MyProject',         type: 'text',     hint: 'Azure DevOps project name' },
      { key: 'token',        label: 'Personal Access Token',     placeholder: 'Paste PAT',               type: 'password', hint: 'User Settings > PATs — Work Items: Read & write scope required' },
      { key: 'assignedTo',   label: 'Assign To (optional)',      placeholder: 'e.g., john@company.com',  type: 'text',     hint: 'User email or display name. Leave blank for unassigned.' },
      { key: 'areaPath',     label: 'Area Path (optional)',      placeholder: 'e.g., MyProject\\QA',     type: 'text',     hint: 'Work item area path. Leave blank for project default.' },
    ],
  },
};

/* ── Priority / Severity mappings ──────────────────── */
const SEV_TO_JIRA_PRI = { Critical: 'Blocker', High: 'Critical', Medium: 'Major', Low: 'Minor' };
const PRI_TO_LINEAR   = { P0: 1, P1: 2, P2: 3, P3: 4 };
const SEV_TO_YT_PRI   = { Critical: 'Show-stopper', High: 'Critical', Medium: 'Major', Low: 'Normal' };
const SEV_TO_ADO      = { Critical: '1 - Critical', High: '2 - High', Medium: '3 - Medium', Low: '4 - Low' };
const PRI_TO_ADO      = { P0: 1, P1: 2, P2: 3, P3: 4 };

/* ══════════════════════════════════════════════════════
   DESCRIPTION BUILDERS
══════════════════════════════════════════════════════ */

/**
 * Atlassian Document Format (ADF) for Jira Cloud REST API v3.
 * Produces a fully structured description with every standard QA section.
 */
function buildJiraADF(t, buildVersion) {
  const c = [];

  const h    = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
  const para = (text)        => ({ type: 'paragraph', content: [{ type: 'text', text: text || '—' }] });
  const bold = (text)        => ({ type: 'text', text, marks: [{ type: 'strong' }] });
  const code = (text)        => ({ type: 'text', text, marks: [{ type: 'code'   }] });
  const em   = (text)        => ({ type: 'text', text, marks: [{ type: 'em'     }] });
  const ol   = (items)       => ({
    type: 'orderedList',
    content: items.map(s => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] })),
  });
  const ul   = (items)       => ({
    type: 'bulletList',
    content: items.map(s => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] })),
  });

  // ── Bug Description ──
  c.push(h(3, '🐛 Bug Description'));
  c.push(para(t.objectives?.delta || t.objectives?.actualBehaviour || '—'));
  c.push({
    type: 'paragraph',
    content: [
      bold('Severity: '), { type: 'text', text: t.severity || '—' },
      { type: 'text', text: '  |  ' }, bold('Priority: '), { type: 'text', text: t.priority || '—' },
      { type: 'text', text: '  |  ' }, bold('Type: '),     { type: 'text', text: t.ticketType || 'Bug' },
      { type: 'text', text: '  |  ' }, bold('Effort: '),   { type: 'text', text: t.additionalDetails?.estimatedFixEffort || 'M' },
    ],
  });

  // ── Preconditions ──
  const pre = t.criteria?.preconditions || [];
  if (pre.length) { c.push(h(3, '🔑 Preconditions')); c.push(ul(pre)); }

  // ── Steps to Reproduce ──
  c.push(h(3, '📋 Steps to Reproduce'));
  const steps = t.criteria?.stepsToReproduce || [];
  if (steps.length) c.push(ol(steps));
  else c.push(para('No steps provided'));

  // ── Expected Result ──
  c.push(h(3, '✅ Expected Result'));
  c.push(para(t.objectives?.expectedBehaviour || '—'));

  // ── Actual Result ──
  c.push(h(3, '❌ Actual Result'));
  c.push(para(t.objectives?.actualBehaviour || '—'));

  // ── Environment ──
  c.push(h(3, '🖥️ Environment'));
  const envItems = [
    `Browser / Client: ${t.environment?.browser || 'N/A'}`,
    `Operating System: ${t.environment?.operatingSystem || 'N/A'}`,
    `Test Environment: ${t.environment?.testEnvironment || 'N/A'}`,
    `User Role:        ${t.environment?.userRole || 'N/A'}`,
    `URL / Identifier: ${t.environment?.applicationUrl || 'N/A'}`,
  ];
  if (buildVersion) envItems.push(`Build / Version:  ${buildVersion}`);
  c.push(ul(envItems));

  // ── Root Cause ──
  c.push(h(3, '🔬 Root Cause Analysis'));
  c.push({
    type: 'paragraph',
    content: [
      bold('Probable Layer: '),
      code(t.rootCause?.probableLayer || 'TBD'),
      { type: 'text', text: `  |  Confidence: ${t.rootCause?.confidenceLevel || 'Medium'}` },
    ],
  });
  if (t.rootCause?.summary)             c.push(para(t.rootCause.summary));
  if (t.rootCause?.technicalHypothesis) {
    c.push({ type: 'paragraph', content: [bold('Hypothesis: '), { type: 'text', text: t.rootCause.technicalHypothesis }] });
  }

  // ── Fix Acceptance Criteria ──
  const acs = t.criteria?.fixAcceptanceCriteria || [];
  if (acs.length) { c.push(h(3, '✔️ Fix Acceptance Criteria')); c.push(ul(acs)); }

  // ── Impact ──
  if (t.risks?.userImpact || t.risks?.businessImpact) {
    c.push(h(3, '⚠️ Impact & Risk'));
    const imp = [];
    if (t.risks?.userImpact)     imp.push(`User Impact: ${t.risks.userImpact}`);
    if (t.risks?.businessImpact) imp.push(`Business Impact: ${t.risks.businessImpact}`);
    if (t.risks?.workaround)     imp.push(`Workaround: ${t.risks.workaround}`);
    c.push(ul(imp));
  }

  // ── Remarks ──
  if (t.additionalDetails?.remark) {
    c.push(h(3, '📝 Remarks'));
    c.push(para(t.additionalDetails.remark));
  }

  c.push({ type: 'rule' });
  c.push({ type: 'paragraph', content: [em('Generated by B.L.A.S.T. Defect Radar — RICE-POT Framework · qualiaqa.vercel.app')] });

  return { type: 'doc', version: 1, content: c };
}

/**
 * Structured Markdown for YouTrack · Linear · GitHub Issues.
 * Fully-formed description with every QA section as a heading.
 */
function buildMarkdownDesc(t, buildVersion) {
  let d = '';

  d += `## 🐛 Bug Description\n`;
  d += `${t.objectives?.delta || t.objectives?.actualBehaviour || '—'}\n\n`;
  d += `> **Severity:** ${t.severity} | **Priority:** ${t.priority} | **Type:** ${t.ticketType || 'Bug'} | **Effort:** ${t.additionalDetails?.estimatedFixEffort || 'M'}\n\n`;

  const pre = t.criteria?.preconditions || [];
  if (pre.length) { d += `## 🔑 Preconditions\n`; d += pre.map(p => `- ${p}`).join('\n') + '\n\n'; }

  d += `## 📋 Steps to Reproduce\n`;
  const steps = t.criteria?.stepsToReproduce || [];
  d += steps.length ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : '_No steps provided_\n\n';

  d += `## ✅ Expected Result\n${t.objectives?.expectedBehaviour || '—'}\n\n`;
  d += `## ❌ Actual Result\n${t.objectives?.actualBehaviour || '—'}\n\n`;

  d += `## 🖥️ Environment\n| Field | Value |\n|:---|:---|\n`;
  d += `| Browser / Client | ${t.environment?.browser || 'N/A'} |\n`;
  d += `| Operating System | ${t.environment?.operatingSystem || 'N/A'} |\n`;
  d += `| Test Environment | ${t.environment?.testEnvironment || 'N/A'} |\n`;
  d += `| User Role | ${t.environment?.userRole || 'N/A'} |\n`;
  d += `| URL / Identifier | ${t.environment?.applicationUrl || 'N/A'} |\n`;
  if (buildVersion) d += `| Build / Version | ${buildVersion} |\n`;
  d += '\n';

  d += `## 🔬 Root Cause Analysis\n`;
  d += `**Probable Layer:** \`${t.rootCause?.probableLayer || 'TBD'}\` | **Confidence:** ${t.rootCause?.confidenceLevel || 'Medium'}\n\n`;
  if (t.rootCause?.summary) d += `${t.rootCause.summary}\n\n`;
  if (t.rootCause?.technicalHypothesis) d += `**Technical Hypothesis:** ${t.rootCause.technicalHypothesis}\n\n`;

  const acs = t.criteria?.fixAcceptanceCriteria || [];
  if (acs.length) { d += `## ✔️ Fix Acceptance Criteria\n`; d += acs.map(ac => `- [ ] ${ac}`).join('\n') + '\n\n'; }

  if (t.risks?.userImpact || t.risks?.businessImpact) {
    d += `## ⚠️ Impact & Risk\n`;
    if (t.risks?.userImpact)     d += `- **User Impact:** ${t.risks.userImpact}\n`;
    if (t.risks?.businessImpact) d += `- **Business Impact:** ${t.risks.businessImpact}\n`;
    if (t.risks?.workaround)     d += `- **Workaround:** ${t.risks.workaround}\n`;
    d += '\n';
  }

  if (t.additionalDetails?.remark) d += `## 📝 Remarks\n${t.additionalDetails.remark}\n\n`;

  d += `---\n*Generated by [B.L.A.S.T. Defect Radar](https://qualiaqa.vercel.app) — RICE-POT Framework*\n`;
  return d;
}

/* ══════════════════════════════════════════════════════
   BUG TRACKER SERVICE
══════════════════════════════════════════════════════ */
class BugTrackerService {

  /* ── Jira Cloud ──────────────────────────────────── */
  async pushToJira(ticket, cfg) {
    const auth         = btoa(`${cfg.email}:${cfg.apiToken}`);
    const base         = cfg.baseUrl.replace(/\/$/, '');
    const buildVersion = ticket.buildVersion;

    const fields = {
      project:     { key: cfg.projectKey },
      summary:     ticket.title,
      description: buildJiraADF(ticket, buildVersion),
      issuetype:   { name: ticket.jiraFields?.issueType || 'Bug' },
      priority:    { name: SEV_TO_JIRA_PRI[ticket.severity] || 'Major' },
      labels:      (ticket.jiraFields?.labels || []).filter(l => /^[a-zA-Z0-9_-]+$/.test(l)),
    };

    if (cfg.assigneeId?.trim())  fields.assignee    = { accountId: cfg.assigneeId.trim() };
    if (cfg.component?.trim())   fields.components  = [{ name: cfg.component.trim() }];
    if (buildVersion)            fields.fixVersions = [{ name: buildVersion }];

    const doPost = (f) => fetch(`${base}/rest/api/3/issue`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ fields: f }),
    });

    let res = await doPost(fields);

    // fixVersions/components may not exist in the project — retry without them
    if (!res.ok && res.status === 400) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.errorMessages?.[0] || Object.values(err.errors || {})[0] || '').toLowerCase();
      if (msg.includes('version') || msg.includes('component')) {
        const stripped = { ...fields };
        delete stripped.fixVersions;
        delete stripped.components;
        res = await doPost(stripped);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.errorMessages?.[0] || Object.values(err.errors || {})[0] || `HTTP ${res.status}`;
      if (res.status === 401) throw new Error('Invalid credentials — check email and API token');
      if (res.status === 403) throw new Error('Forbidden — check project permissions and CORS settings for Jira Cloud');
      throw new Error(msg);
    }

    const data = await res.json();
    return { id: data.key, url: `${base}/browse/${data.key}` };
  }

  /* ── YouTrack ────────────────────────────────────── */
  async pushToYouTrack(ticket, cfg) {
    const base         = cfg.baseUrl.replace(/\/$/, '');
    const buildVersion = ticket.buildVersion;
    const headers      = { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' };

    const customFields = [
      { $type: 'SingleEnumIssueCustomField', name: 'Type',     value: { $type: 'EnumBundleElement', name: ticket.ticketType === 'Bug' ? 'Bug' : 'Task' } },
      { $type: 'SingleEnumIssueCustomField', name: 'Priority', value: { $type: 'EnumBundleElement', name: SEV_TO_YT_PRI[ticket.severity] || 'Major' } },
    ];
    if (cfg.assignee?.trim()) {
      customFields.push({ $type: 'SingleUserIssueCustomField', name: 'Assignee', value: { $type: 'User', login: cfg.assignee.trim() } });
    }
    if (buildVersion) {
      customFields.push({ $type: 'MultiVersionIssueCustomField', name: 'Affected versions', value: [{ $type: 'VersionBundleElement', name: buildVersion }] });
    }

    let res = await fetch(`${base}/api/issues?fields=id,idReadable`, {
      method: 'POST', headers,
      body: JSON.stringify({
        project: { id: cfg.projectId },
        summary: ticket.title,
        description: buildMarkdownDesc(ticket, buildVersion),
        customFields,
      }),
    });

    // Custom fields may not exist in the project — retry with just summary + description
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 400 && (errText.includes('customField') || errText.includes('Unknown') || errText.includes('field'))) {
        res = await fetch(`${base}/api/issues?fields=id,idReadable`, {
          method: 'POST', headers,
          body: JSON.stringify({
            project:     { id: cfg.projectId },
            summary:     ticket.title,
            description: buildMarkdownDesc(ticket, buildVersion),
          }),
        });
      }
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid token — check your YouTrack permanent token');
      if (res.status === 404) throw new Error(`Project "${cfg.projectId}" not found`);
      throw new Error(`YouTrack HTTP ${res.status}`);
    }

    const data = await res.json();
    return { id: data.idReadable, url: `${base}/issue/${data.idReadable}` };
  }

  /* ── Linear ──────────────────────────────────────── */
  async pushToLinear(ticket, cfg) {
    const buildVersion = ticket.buildVersion;
    const input = {
      teamId:      cfg.teamId,
      title:       ticket.title,
      description: buildMarkdownDesc(ticket, buildVersion),
      priority:    PRI_TO_LINEAR[ticket.priority] || 3,
    };
    if (cfg.assigneeId?.trim()) input.assigneeId = cfg.assigneeId.trim();

    const res  = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { Authorization: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id identifier url title }
          }
        }`,
        variables: { input },
      }),
    });

    const data = await res.json();
    if (data.errors?.length)              throw new Error(data.errors[0].message);
    if (!data.data?.issueCreate?.success) throw new Error('Linear issue creation failed');
    const issue = data.data.issueCreate.issue;
    return { id: issue.identifier, url: issue.url };
  }

  /* ── GitHub Issues ───────────────────────────────── */
  async pushToGitHub(ticket, cfg) {
    const buildVersion = ticket.buildVersion;
    const sevLabel     = { Critical: 'severity:critical', High: 'severity:high', Medium: 'severity:medium', Low: 'severity:low' }[ticket.severity];
    const labels       = [...new Set([...(ticket.jiraFields?.labels || ['bug', 'ai-detected']).slice(0, 4), ...(sevLabel ? [sevLabel] : [])])];

    const body = { title: ticket.title, body: buildMarkdownDesc(ticket, buildVersion), labels };
    if (cfg.assignee?.trim()) body.assignees = [cfg.assignee.trim()];

    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Invalid GitHub token — check Personal Access Token permissions');
      if (res.status === 404) throw new Error(`Repo ${cfg.owner}/${cfg.repo} not found or token lacks issues:write scope`);
      throw new Error(err.message || `GitHub HTTP ${res.status}`);
    }

    const data = await res.json();
    return { id: `#${data.number}`, url: data.html_url };
  }

  /* ── Azure DevOps ────────────────────────────────── */
  async pushToAzureDevOps(ticket, cfg) {
    const base         = `https://dev.azure.com/${encodeURIComponent(cfg.organization)}/${encodeURIComponent(cfg.project)}`;
    const auth         = btoa(`:${cfg.token}`);
    const buildVersion = ticket.buildVersion;

    // Repro steps as HTML ordered list (ADO ReproSteps field renders HTML)
    const reproHtml = (ticket.criteria?.stepsToReproduce || [])
      .map((s, i) => `<li>${i + 1}. ${s}</li>`)
      .join('');

    const systemInfo = [
      `Browser: ${ticket.environment?.browser || 'N/A'}`,
      `OS: ${ticket.environment?.operatingSystem || 'N/A'}`,
      `Environment: ${ticket.environment?.testEnvironment || 'N/A'}`,
      buildVersion ? `Build: ${buildVersion}` : '',
    ].filter(Boolean).join(' | ');

    const patchDoc = [
      { op: 'add', path: '/fields/System.Title',                    value: ticket.title },
      { op: 'add', path: '/fields/System.Description',              value: buildMarkdownDesc(ticket, buildVersion) },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority',  value: PRI_TO_ADO[ticket.priority] || 2 },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Severity',  value: SEV_TO_ADO[ticket.severity] || '2 - High' },
      { op: 'add', path: '/fields/System.Tags',                     value: (ticket.jiraFields?.labels || ['ai-detected', 'ricepot']).join('; ') },
    ];

    if (reproHtml)              patchDoc.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.ReproSteps',  value: `<ol>${reproHtml}</ol>` });
    if (systemInfo)             patchDoc.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.SystemInfo',  value: systemInfo });
    if (cfg.assignedTo?.trim()) patchDoc.push({ op: 'add', path: '/fields/System.AssignedTo',              value: cfg.assignedTo.trim() });
    if (buildVersion)           patchDoc.push({ op: 'add', path: '/fields/Microsoft.VSTS.Build.FoundIn',   value: buildVersion });
    if (cfg.areaPath?.trim())   patchDoc.push({ op: 'add', path: '/fields/System.AreaPath',                value: cfg.areaPath.trim() });

    const res = await fetch(`${base}/_apis/wit/workitems/$Bug?api-version=7.1`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patchDoc),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Invalid PAT — check token and Work Items: Read & write scope');
      if (res.status === 404) throw new Error(`Organization "${cfg.organization}" or project "${cfg.project}" not found`);
      throw new Error(err.message || `Azure DevOps HTTP ${res.status}`);
    }

    const data = await res.json();
    return { id: `#${data.id}`, url: `${base}/_workitems/edit/${data.id}` };
  }

  /* ── Dispatch ────────────────────────────────────── */
  async push(toolId, ticket, cfg) {
    switch (toolId) {
      case 'jira':        return this.pushToJira(ticket, cfg);
      case 'youtrack':    return this.pushToYouTrack(ticket, cfg);
      case 'linear':      return this.pushToLinear(ticket, cfg);
      case 'github':      return this.pushToGitHub(ticket, cfg);
      case 'azuredevops': return this.pushToAzureDevOps(ticket, cfg);
      default:            throw new Error(`Unknown tracker: ${toolId}`);
    }
  }
}

export const bugTrackerService = new BugTrackerService();

/* ── localStorage helpers ────────────────────────── */
const LS_KEY = 'blast_bt_config';

export function loadBtConfig() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}

export function saveBtConfig(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch {}
}
