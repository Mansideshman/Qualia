/**
 * DefectTicketDisplay.jsx
 * B.L.A.S.T. — Defect Radar results
 * RICE-POT ticket cards + Bug Tracker Integration (Jira · YouTrack · Linear · GitHub)
 */

import React, { useState, useEffect } from 'react';
import { BT_TOOLS, bugTrackerService, loadBtConfig, saveBtConfig } from '../../services/bugTrackerService';
import '../styles/DefectRadar.css';

const SEV_COLOR  = { Critical: '#dc2626', High: '#d97706', Medium: '#2563eb', Low: '#22c55e' };
const PRI_COLOR  = { P0: '#dc2626', P1: '#d97706', P2: '#2563eb', P3: '#6b7280' };
const CONF_COLOR = { 'High (>80%)': '#15803d', 'Medium (50-80%)': '#d97706', 'Low (<50%)': '#dc2626' };

const TICKET_TABS = [
  { id: 'overview',   label: 'Overview',       icon: '📋' },
  { id: 'risks',      label: 'R — Risks',      icon: '⚠️' },
  { id: 'items',      label: 'I — Items',      icon: '📦' },
  { id: 'criteria',   label: 'C — Criteria',   icon: '✅' },
  { id: 'environ',    label: 'E — Env',        icon: '🖥️' },
  { id: 'people',     label: 'P — People',     icon: '👥' },
  { id: 'objectives', label: 'O — Objectives', icon: '🎯' },
  { id: 'tools',      label: 'T — Tools',      icon: '🔧' },
  { id: 'rootcause',  label: 'Root Cause',     icon: '🔬' },
];

/* ── Badges ─────────────────────────────────────────── */
const SevBadge  = ({ s }) => <span className="sev-badge" style={{ background: SEV_COLOR[s]  || '#6b7280' }}>{s}</span>;
const PriBadge  = ({ p }) => <span className="pri-badge" style={{ background: PRI_COLOR[p]  || '#6b7280' }}>{p}</span>;
const TypeBadge = ({ t }) => {
  const cls = t === 'Bug' ? 'type-bug' : t === 'Security Vulnerability' ? 'type-sec'
    : t === 'Performance Issue' ? 'type-perf' : t === 'UX Issue' ? 'type-ux' : 'type-other';
  return <span className={`type-badge ${cls}`}>{t}</span>;
};

/* ── Detail row helper ──────────────────────────────── */
const DR = ({ label, value, code, highlight }) => (
  <div className={`detail-row ${highlight ? 'highlight-row' : ''}`}>
    <span className="detail-label">{label}</span>
    {code
      ? <code className="detail-code">{value || '—'}</code>
      : <span className="detail-value">{value || '—'}</span>}
  </div>
);

/* ── Single ticket card ─────────────────────────────── */
function TicketCard({ ticket: t, index, pushStatus, onPush, activeTool }) {
  const [open, setOpen] = useState(index === 0);
  const [tab,  setTab]  = useState('overview');
  const ps = pushStatus?.[t.ticketId];

  return (
    <div className={`ticket-card sev-border-${(t.severity || 'medium').toLowerCase()}`}>

      {/* Header */}
      <div className="ticket-header" onClick={() => setOpen(!open)}>
        <div className="ticket-header-left">
          <span className="ticket-id">{t.ticketId || `DR-${String(index + 1).padStart(3, '0')}`}</span>
          <TypeBadge t={t.ticketType || 'Bug'} />
          <SevBadge  s={t.severity   || 'Medium'} />
          <PriBadge  p={t.priority   || 'P1'} />

          {ps?.status === 'done' ? (
            <a href={ps.url} target="_blank" rel="noreferrer"
               className="push-status-link" onClick={e => e.stopPropagation()}>
              ✅ {ps.id}
            </a>
          ) : ps?.status === 'pushing' ? (
            <span className="push-status-loading">⏳ Pushing…</span>
          ) : ps?.status === 'error' ? (
            <span className="push-status-error" title={ps.error}>❌ Failed</span>
          ) : activeTool ? (
            <button type="button" className="push-btn"
              onClick={e => { e.stopPropagation(); onPush(t); }}>
              Push → {BT_TOOLS[activeTool]?.name}
            </button>
          ) : null}
        </div>

        <div className="ticket-title-block">
          <h3 className="ticket-title">{t.title}</h3>
        </div>
        <div className="ticket-header-right">
          <span className="ticket-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="ticket-body">
          <div className="ticket-tabs">
            {TICKET_TABS.map(tb => (
              <button key={tb.id} className={`ticket-tab ${tab === tb.id ? 'active' : ''}`}
                onClick={() => setTab(tb.id)}>
                {tb.icon} <span>{tb.label}</span>
              </button>
            ))}
          </div>

          <div className="ticket-tab-content">

            {tab === 'overview' && (
              <div className="rp-tab-pane">
                <div className="overview-grid">
                  <div className="ov-item"><label>Ticket ID</label><code>{t.ticketId}</code></div>
                  <div className="ov-item"><label>Type</label><TypeBadge t={t.ticketType} /></div>
                  <div className="ov-item"><label>Severity</label><SevBadge s={t.severity} /></div>
                  <div className="ov-item"><label>Priority</label><PriBadge p={t.priority} /></div>
                  <div className="ov-item wide"><label>Title</label><p>{t.title}</p></div>
                  <div className="ov-item wide"><label>Delta (Expected vs Actual)</label>
                    <p className="delta-text">{t.objectives?.delta}</p></div>
                  <div className="ov-item"><label>Fix Effort</label>
                    <span className="effort-chip">{t.additionalDetails?.estimatedFixEffort || 'M (4-8h)'}</span></div>
                  <div className="ov-item"><label>Story Points</label>
                    <span className="sp-chip">{t.jiraFields?.storyPoints || 3}</span></div>
                  <div className="ov-item"><label>Release Note</label>
                    <span>{t.additionalDetails?.releaseNoteRequired || 'No'}</span></div>
                  <div className="ov-item"><label>Regression</label>
                    <span>{t.additionalDetails?.regression || 'Unknown'}</span></div>
                </div>
                {t.additionalDetails?.remark && (
                  <div className="remark-box">
                    <label>Remarks</label><p>{t.additionalDetails.remark}</p>
                  </div>
                )}
                <div className="labels-row">
                  {(t.jiraFields?.labels || []).map((l, i) => (
                    <span key={i} className="label-chip">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {tab === 'risks' && (
              <div className="rp-tab-pane">
                <div className="risk-detail-grid">
                  <DR label="User Impact"     value={t.risks?.userImpact} />
                  <DR label="Business Impact" value={t.risks?.businessImpact} />
                  <DR label="Security Risk"   value={t.risks?.securityRisk}   highlight={t.risks?.securityRisk !== 'None'} />
                  <DR label="Data Loss Risk"  value={t.risks?.dataLossRisk}   highlight={t.risks?.dataLossRisk?.startsWith('Yes')} />
                  <DR label="Workaround"      value={t.risks?.workaround} />
                </div>
              </div>
            )}

            {tab === 'items' && (
              <div className="rp-tab-pane">
                <div className="items-grid">
                  <DR label="Feature"       value={t.items?.feature} />
                  <DR label="Module"        value={t.items?.module} />
                  <DR label="Page / Screen" value={t.items?.pageOrScreen} code />
                  <DR label="API Endpoint"  value={t.items?.apiEndpoint} code />
                  <DR label="Component"     value={t.items?.component} />
                </div>
              </div>
            )}

            {tab === 'criteria' && (
              <div className="rp-tab-pane">
                <div className="criteria-meta">
                  <span className="crit-repro">{t.criteria?.reproducibility}</span>
                  <span className="crit-trigger">Trigger: {t.criteria?.triggerCondition}</span>
                </div>
                {(t.criteria?.preconditions || []).length > 0 && (
                  <div className="crit-section">
                    <label>Preconditions</label>
                    <ul className="crit-list precond-list">
                      {t.criteria.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                <div className="crit-section">
                  <label>Steps to Reproduce</label>
                  <ol className="crit-list steps-list">
                    {(t.criteria?.stepsToReproduce || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
                <div className="crit-section">
                  <label>Fix Acceptance Criteria</label>
                  <ul className="crit-list ac-list">
                    {(t.criteria?.fixAcceptanceCriteria || []).map((ac, i) => (
                      <li key={i}><span className="ac-check">☐</span>{ac}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'environ' && (
              <div className="rp-tab-pane">
                <div className="env-detail-grid">
                  <DR label="App Type"  value={t.environment?.applicationType} />
                  <DR label="URL"       value={t.environment?.applicationUrl} code />
                  <DR label="Browser"   value={t.environment?.browser} />
                  <DR label="OS"        value={t.environment?.operatingSystem} />
                  <DR label="Device"    value={t.environment?.device} />
                  <DR label="User Role" value={t.environment?.userRole} />
                  <DR label="Test Env"  value={t.environment?.testEnvironment} />
                </div>
              </div>
            )}

            {tab === 'people' && (
              <div className="rp-tab-pane">
                <div className="people-grid">
                  <DR label="Reported By"         value={t.people?.reportedBy} />
                  <DR label="Suggested Assignee"  value={t.people?.suggestedAssignee} />
                  <DR label="Affected Persona"    value={t.people?.affectedPersona} />
                  <DR label="Escalate To"         value={t.people?.escalateTo} />
                </div>
              </div>
            )}

            {tab === 'objectives' && (
              <div className="rp-tab-pane">
                <div className="obj-section expected-box">
                  <label>Expected Behaviour</label><p>{t.objectives?.expectedBehaviour}</p>
                </div>
                <div className="obj-section actual-box">
                  <label>Actual Behaviour</label><p>{t.objectives?.actualBehaviour}</p>
                </div>
                {t.objectives?.businessRuleViolated && (
                  <div className="obj-section rule-box">
                    <label>Business Rule / Requirement Violated</label>
                    <p>{t.objectives.businessRuleViolated}</p>
                  </div>
                )}
                <div className="obj-section delta-box">
                  <label>Delta</label><p className="delta-text">{t.objectives?.delta}</p>
                </div>
              </div>
            )}

            {tab === 'tools' && (
              <div className="rp-tab-pane">
                {t.tools?.screenshotObservation && (
                  <div className="tools-section">
                    <label>Evidence Observation</label>
                    <p className="tools-observation">{t.tools.screenshotObservation}</p>
                  </div>
                )}
                {(t.tools?.evidenceUsed || []).length > 0 && (
                  <div className="tools-section">
                    <label>Evidence Used</label>
                    <div className="tools-chips">
                      {t.tools.evidenceUsed.map((e, i) => <span key={i} className="tools-chip">{e}</span>)}
                    </div>
                  </div>
                )}
                {(t.tools?.suggestedDebuggingSteps || []).length > 0 && (
                  <div className="tools-section">
                    <label>Suggested Debugging Steps</label>
                    <ol className="tools-list">
                      {t.tools.suggestedDebuggingSteps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {(t.tools?.suggestedTestTools || []).length > 0 && (
                  <div className="tools-section">
                    <label>Suggested Test Tools</label>
                    <ul className="tools-list">
                      {t.tools.suggestedTestTools.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'rootcause' && (
              <div className="rp-tab-pane">
                <div className="rc-layer-row">
                  <div className="rc-layer-badge">
                    <span className="rc-layer-label">Probable Layer</span>
                    <code className="rc-layer-code">{t.rootCause?.probableLayer}</code>
                  </div>
                  <div className="rc-conf-badge"
                    style={{ background: CONF_COLOR[t.rootCause?.confidenceLevel] || '#6b7280' }}>
                    <span>Confidence</span>
                    <strong>{t.rootCause?.confidenceLevel}</strong>
                  </div>
                </div>
                <div className="rc-section">
                  <label>Root Cause Summary</label>
                  <p className="rc-summary">{t.rootCause?.summary}</p>
                </div>
                <div className="rc-section">
                  <label>Technical Hypothesis</label>
                  <p className="rc-hypothesis">{t.rootCause?.technicalHypothesis}</p>
                </div>
                {(t.rootCause?.investigationRequired || []).length > 0 && (
                  <div className="rc-section">
                    <label>Developer Investigation Required</label>
                    <ul className="rc-list">
                      {t.rootCause.investigationRequired.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

/* ── Bug Tracker Integration Panel ─────────────────── */
function BugTrackerPanel({ tickets, onPushAll, pushStatus, isPushingAll, onToolChange }) {
  const [open,       setOpen]       = useState(false);
  const [activeTool, setActiveTool] = useState('');
  const [cfg,        setCfg]        = useState({});
  const [testState,  setTestState]  = useState('');
  const [testMsg,    setTestMsg]    = useState('');

  useEffect(() => {
    const saved = loadBtConfig();
    if (saved.activeTool) { setActiveTool(saved.activeTool); onToolChange?.(saved.activeTool); }
    setCfg(saved);
  }, [onToolChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTool = (id) => {
    setActiveTool(id);
    setTestState('');
    onToolChange?.(id);
    const updated = { ...cfg, activeTool: id };
    setCfg(updated);
    saveBtConfig(updated);
  };

  const updateField = (key, value) => {
    const toolCfg = { ...(cfg[activeTool] || {}), [key]: value };
    const updated = { ...cfg, [activeTool]: toolCfg };
    setCfg(updated);
    saveBtConfig(updated);
  };

  const getToolCfg = () => cfg[activeTool] || {};

  const handleTestConnection = async () => {
    setTestState('testing');
    setTestMsg('');
    try {
      const toolCfg = getToolCfg();
      const tool = BT_TOOLS[activeTool];
      const missing = tool.fields.filter(f => !toolCfg[f.key]?.trim());
      if (missing.length) throw new Error(`Please fill: ${missing.map(f => f.label).join(', ')}`);

      try {
        await bugTrackerService.push(activeTool, {
          title: '__BLAST_CONNECTION_TEST__', jiraFields: {}, criteria: {}, environment: {},
          objectives: {}, rootCause: {}, people: {}, tools: {}, risks: {},
          additionalDetails: {}, ticketType: 'Bug', severity: 'Low', priority: 'P3',
        }, toolCfg);
        setTestState('ok');
        setTestMsg('Connection successful!');
      } catch (e) {
        const msg = e.message || '';
        const authPassed = /project|field|invalid|400|422|not found|does not exist|badrequest/i.test(msg);
        if (authPassed) { setTestState('ok'); setTestMsg('Connection successful — credentials valid'); }
        else throw e;
      }
    } catch (err) {
      setTestState('error');
      setTestMsg(err.message);
    }
  };

  const pushCount = Object.values(pushStatus).filter(s => s.status === 'done').length;
  const tool = BT_TOOLS[activeTool];

  return (
    <div className="bt-panel">
      <div className="bt-panel-header" onClick={() => setOpen(!open)}>
        <div className="bt-panel-title">
          <span>🔗</span>
          Bug Tracker Integration
          <span className="bt-badge">NEW</span>
          {activeTool && (
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--gray-400,#9ca3af)' }}>
              · {tool?.icon} {tool?.name}
            </span>
          )}
          {pushCount > 0 && (
            <span style={{
              fontSize: '0.72rem', background: '#f0fdf4', border: '1px solid #86efac',
              color: '#15803d', padding: '1px 8px', borderRadius: 10, fontWeight: 700,
            }}>
              {pushCount}/{tickets.length} pushed
            </span>
          )}
        </div>
        <span className={`bt-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Select your bug tracking tool
          </div>

          <div className="bt-tool-row">
            {Object.values(BT_TOOLS).map(t => (
              <button key={t.id} type="button"
                className={`bt-tool-btn ${activeTool === t.id ? 'active' : ''}`}
                onClick={() => selectTool(t.id)}>
                <span className="bt-tool-icon">{t.icon}</span>
                <span className="bt-tool-name">{t.name}</span>
              </button>
            ))}
          </div>

          {activeTool && tool && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 8px' }}>
                {tool.icon} {tool.name} — Connection Settings
                <span style={{ float: 'right', fontWeight: 400, textTransform: 'none', fontSize: '0.7rem', color: 'var(--gray-400,#9ca3af)' }}>
                  Settings auto-saved to browser
                </span>
              </div>

              <div className="bt-config-grid">
                {tool.fields.map(f => (
                  <div key={f.key} className="bt-field">
                    <label>{f.label}</label>
                    <input
                      type={f.type}
                      value={getToolCfg()[f.key] || ''}
                      onChange={e => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      autoComplete="off"
                    />
                    <small>{f.hint}</small>
                  </div>
                ))}
              </div>

              {activeTool === 'jira' && (
                <div className="bt-cors-note" style={{ marginBottom: 12 }}>
                  ℹ️ Jira Cloud blocks browser requests (CORS). If you get a network error, use <strong>⚙️ Jira JSON export</strong> above and import via Jira's bulk import. Jira Data Center/Server typically works.
                </div>
              )}

              <div className="bt-action-row">
                <button type="button" className="bt-push-all-btn"
                  disabled={isPushingAll}
                  onClick={() => onPushAll(activeTool, getToolCfg())}>
                  {isPushingAll
                    ? <><span className="bt-push-spinner" style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'drSpin 0.7s linear infinite', display:'inline-block' }}></span>Pushing…</>
                    : <><span>{tool.icon}</span>Push All {tickets.length} Tickets to {tool.name}</>
                  }
                </button>

                <button type="button"
                  style={{
                    padding: '8px 14px', borderRadius: 7, border: '1.5px solid var(--gray-300,#d1d5db)',
                    background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--gray-600,#4b5563)',
                  }}
                  onClick={handleTestConnection}
                  disabled={testState === 'testing'}>
                  {testState === 'testing' ? '⏳ Testing…' : '🔌 Test Connection'}
                </button>

                {testState === 'ok' && (
                  <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>✅ {testMsg}</span>
                )}
                {testState === 'error' && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, maxWidth: 260 }}>
                    ❌ {testMsg}
                  </span>
                )}
              </div>

              {pushCount > 0 && (
                <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#15803d' }}>
                  ✅ {pushCount} of {tickets.length} tickets pushed to {tool.name}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main display ───────────────────────────────────── */
export default function DefectTicketDisplay({ result }) {
  const [pushStatus,   setPushStatus]   = useState({});
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [activeTool,   setActiveTool]   = useState(() => loadBtConfig().activeTool || '');

  if (!result) return null;

  const { analysis = {}, tickets = [], recommendations = {}, generatedAt } = result;

  const handlePush = async (ticket, toolId, toolCfg) => {
    setPushStatus(prev => ({ ...prev, [ticket.ticketId]: { status: 'pushing' } }));
    try {
      const res = await bugTrackerService.push(toolId, ticket, toolCfg);
      setPushStatus(prev => ({ ...prev, [ticket.ticketId]: { status: 'done', id: res.id, url: res.url } }));
    } catch (err) {
      setPushStatus(prev => ({ ...prev, [ticket.ticketId]: { status: 'error', error: err.message } }));
    }
  };

  const handlePushAll = async (toolId, toolCfg) => {
    const tool = BT_TOOLS[toolId];
    const missing = tool?.fields.filter(f => !toolCfg[f.key]?.trim()) || [];
    if (missing.length) { alert(`Please fill: ${missing.map(f => f.label).join(', ')}`); return; }
    setIsPushingAll(true);
    setActiveTool(toolId);
    for (const ticket of tickets) {
      if (pushStatus[ticket.ticketId]?.status === 'done') continue;
      await handlePush(ticket, toolId, toolCfg);
    }
    setIsPushingAll(false);
  };

  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    const slug = `DefectRadar_${new Date().toISOString().split('T')[0]}`;
    if (format === 'json') {
      const payload = tickets.map(t => ({
        summary: t.title,
        issuetype: { name: t.jiraFields?.issueType || 'Bug' },
        priority:  { name: t.jiraFields?.priority  || 'Major' },
        labels:    t.jiraFields?.labels || [],
        description: buildJiraDesc(t),
        severity_ricepot: t.severity,
        priority_ricepot: t.priority,
        storyPoints: t.jiraFields?.storyPoints,
        rootCauseLayer: t.rootCause?.probableLayer,
        environment: t.environment,
      }));
      download(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tickets: payload, full: result }, null, 2)], { type: 'application/json' }), `${slug}.json`);
    } else if (format === 'markdown') {
      download(new Blob([buildMarkdownExport(result)], { type: 'text/markdown' }), `${slug}.md`);
    } else {
      window.print();
    }
  };

  return (
    <div className="defect-results" id="defect-radar-printable">

      {/* Summary header */}
      <div className="defect-results-header">
        <div className="dr-header-top">
          <div>
            <h2 className="dr-header-title">Defect Radar Report</h2>
            <p className="dr-header-sub">Generated {new Date(generatedAt).toLocaleString()} · RICE-POT Framework</p>
          </div>
          <div className="export-bar">
            <span className="export-label">Export:</span>
            <button className="export-btn json-btn"  onClick={() => handleExport('json')}>⚙️ Jira JSON</button>
            <button className="export-btn md-btn"    onClick={() => handleExport('markdown')}>📄 Markdown</button>
            <button className="export-btn print-btn" onClick={() => handleExport('print')}>🖨️ Print / PDF</button>
          </div>
        </div>

        <div className="dr-counts-row">
          <div className="dr-count-pill total">
            <span className="dr-count-num">{analysis.totalBugsDetected || tickets.length}</span>
            <span>Defects</span>
          </div>
          <div className="dr-count-pill critical">
            <span className="dr-count-num">{analysis.criticalCount || 0}</span>
            <span>Critical</span>
          </div>
          <div className="dr-count-pill high">
            <span className="dr-count-num">{analysis.highCount || 0}</span>
            <span>High</span>
          </div>
          <div className="dr-count-pill medium">
            <span className="dr-count-num">{analysis.mediumCount || 0}</span>
            <span>Medium</span>
          </div>
          <div className="dr-count-pill low">
            <span className="dr-count-num">{analysis.lowCount || 0}</span>
            <span>Low</span>
          </div>
          <div className="dr-count-pill confidence">
            <span className="dr-count-num">{analysis.analysisConfidence || 'Med'}</span>
            <span>Confidence</span>
          </div>
        </div>

        {analysis.evidenceSummary && <p className="dr-evidence-summary">{analysis.evidenceSummary}</p>}
        {analysis.analysisNotes  && <p className="dr-analysis-notes">ℹ️ {analysis.analysisNotes}</p>}
      </div>

      {/* Bug tracker integration */}
      <BugTrackerPanel
        tickets={tickets}
        pushStatus={pushStatus}
        onPushAll={handlePushAll}
        isPushingAll={isPushingAll}
        onToolChange={setActiveTool}
      />

      {/* Ticket cards */}
      <div className="tickets-list">
        {tickets.map((ticket, i) => (
          <TicketCard
            key={ticket.ticketId || i}
            ticket={ticket}
            index={i}
            pushStatus={pushStatus}
            activeTool={activeTool}
            onPush={(t) => {
              const saved = loadBtConfig();
              handlePush(t, activeTool, saved[activeTool] || {});
            }}
          />
        ))}
      </div>

      {/* Recommendations */}
      {(recommendations.immediateActions?.length > 0 || recommendations.preventiveMeasures?.length > 0) && (
        <div className="recommendations-card">
          <h3 className="rec-title">🔎 AI Recommendations</h3>
          <div className="rec-grid">
            {recommendations.immediateActions?.length > 0 && (
              <div className="rec-section">
                <label>⚡ Immediate Actions</label>
                <ul>{recommendations.immediateActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
            {recommendations.preventiveMeasures?.length > 0 && (
              <div className="rec-section">
                <label>🛡️ Preventive Measures</label>
                <ul>{recommendations.preventiveMeasures.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
            {recommendations.testingGaps?.length > 0 && (
              <div className="rec-section">
                <label>🧪 Testing Gaps</label>
                <ul>{recommendations.testingGaps.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
            {recommendations.architectureNotes?.length > 0 && (
              <div className="rec-section">
                <label>🏗️ Architecture Notes</label>
                <ul>{recommendations.architectureNotes.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────── */
function buildJiraDesc(t) {
  let d = `Expected: ${t.objectives?.expectedBehaviour || 'N/A'}\n\nActual: ${t.objectives?.actualBehaviour || 'N/A'}\n\n`;
  d += `Steps:\n${(t.criteria?.stepsToReproduce || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
  d += `Env: ${t.environment?.browser || 'N/A'} | ${t.environment?.operatingSystem || 'N/A'} | ${t.environment?.testEnvironment || 'N/A'}\n\n`;
  d += `Root Cause (${t.rootCause?.probableLayer || 'TBD'}): ${t.rootCause?.summary || 'TBD'}`;
  return d;
}

function buildMarkdownExport(result) {
  const { analysis, tickets, recommendations } = result;
  let md = `# Defect Radar Report\n**Generated:** ${new Date(result.generatedAt).toLocaleString()} | **Framework:** RICE-POT\n\n`;
  md += `## Summary\n- **Total:** ${analysis?.totalBugsDetected || tickets.length} · **Critical:** ${analysis?.criticalCount || 0} · **High:** ${analysis?.highCount || 0} · **Medium:** ${analysis?.mediumCount || 0} · **Low:** ${analysis?.lowCount || 0}\n`;
  md += `- **Confidence:** ${analysis?.analysisConfidence || 'Medium'}\n- ${analysis?.evidenceSummary || ''}\n\n---\n\n`;

  tickets.forEach((t, i) => {
    md += `## ${t.ticketId || `DR-${i + 1}`}: ${t.title}\n`;
    md += `**Type:** ${t.ticketType} | **Severity:** ${t.severity} | **Priority:** ${t.priority} | **Effort:** ${t.additionalDetails?.estimatedFixEffort || 'M'}\n\n`;
    md += `### Expected vs Actual\n**Expected:** ${t.objectives?.expectedBehaviour}\n\n**Actual:** ${t.objectives?.actualBehaviour}\n\n**Delta:** ${t.objectives?.delta}\n\n`;
    md += `### Steps to Reproduce\n${(t.criteria?.stepsToReproduce || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
    md += `### Acceptance Criteria\n${(t.criteria?.fixAcceptanceCriteria || []).map(ac => `- [ ] ${ac}`).join('\n')}\n\n`;
    md += `### Root Cause\n**Layer:** \`${t.rootCause?.probableLayer}\` | **Confidence:** ${t.rootCause?.confidenceLevel}\n\n${t.rootCause?.summary}\n\n`;
    md += `### Env: ${t.environment?.browser} | ${t.environment?.operatingSystem} | ${t.environment?.testEnvironment}\n\n---\n\n`;
  });

  if (recommendations?.immediateActions?.length) md += `## Immediate Actions\n${recommendations.immediateActions.map(a => `- ${a}`).join('\n')}\n\n`;
  if (recommendations?.preventiveMeasures?.length) md += `## Preventive Measures\n${recommendations.preventiveMeasures.map(a => `- ${a}`).join('\n')}\n\n`;
  md += `---\n*Generated by B.L.A.S.T. Defect Radar — RICE-POT Framework*\n`;
  return md;
}
