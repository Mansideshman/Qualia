import React, { useState, useEffect } from 'react';
import { BT_TOOLS, bugTrackerService, loadBtConfig, saveBtConfig } from '../../services/bugTrackerService';
import '../styles/CreateDefectModal.css';

const PRI_TO_P  = { Critical: 'P0', High: 'P1', Medium: 'P2', Low: 'P3' };
const SEV_NORM  = { Critical: 'Critical', High: 'High', Major: 'High', Medium: 'Medium', Minor: 'Low', Trivial: 'Low', Low: 'Low' };

function buildTicket(tc, fields) {
  const labels = [tc.component, 'ai-generated']
    .filter(Boolean)
    .map(s => s.replace(/\s+/g, '-').toLowerCase())
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

  return {
    title:       fields.title.trim(),
    severity:    fields.severity,
    priority:    fields.priority,
    ticketType:  'Bug',
    buildVersion: fields.buildVersion.trim(),
    jiraFields:  { labels, issueType: 'Bug' },
    criteria: {
      preconditions:         tc.preconditions ? [tc.preconditions] : [],
      stepsToReproduce:      fields.stepsToReproduce.split('\n').filter(s => s.trim()),
      fixAcceptanceCriteria: [],
    },
    environment: {
      browser:           '',
      operatingSystem:   '',
      testEnvironment:   fields.environment,
      userRole:          '',
      applicationUrl:    '',
    },
    objectives: {
      expectedBehaviour: tc.expectedResult || '',
      actualBehaviour:   fields.actualResult,
      delta:             fields.actualResult,
    },
    rootCause: {
      probableLayer:        tc.component || 'Unknown',
      confidenceLevel:      'Medium',
      summary:              `Test case ${tc.testCaseId} failed: ${tc.summary}`,
      technicalHypothesis:  '',
    },
    risks:             { userImpact: '', businessImpact: '', workaround: '' },
    additionalDetails: { estimatedFixEffort: 'M', remark: tc.comments || '' },
    people: {},
    tools:  {},
  };
}

export default function CreateDefectModal({ tc, onClose, onDefectCreated }) {
  const [activeTool, setActiveTool] = useState('');
  const [cfg,        setCfg]        = useState({});
  const [showCreds,  setShowCreds]  = useState(false);
  const [testState,  setTestState]  = useState('');
  const [testMsg,    setTestMsg]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  /* pre-filled defect fields */
  const [title,             setTitle]             = useState(`[BUG] ${tc.testCaseId} — ${tc.summary}`);
  const [severity,          setSeverity]          = useState(SEV_NORM[tc.severity] || 'High');
  const [priority,          setPriority]          = useState(PRI_TO_P[tc.priority] || 'P2');
  const [stepsToReproduce,  setStepsToReproduce]  = useState(tc.testSteps || '');
  const [actualResult,      setActualResult]      = useState(tc.actualResult || '');
  const [environment,       setEnvironment]       = useState(tc.testEnvironment || '');
  const [buildVersion,      setBuildVersion]      = useState('');

  useEffect(() => {
    const saved = loadBtConfig();
    setCfg(saved);
    if (saved.activeTool) setActiveTool(saved.activeTool);
  }, []);

  const selectTool = (id) => {
    setActiveTool(id);
    setTestState('');
    setTestMsg('');
    setResult(null);
    setError('');
    const updated = { ...cfg, activeTool: id };
    setCfg(updated);
    saveBtConfig(updated);
  };

  const updateCred = (key, value) => {
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
      const missing = tool.fields.filter(f => !f.label.toLowerCase().includes('optional') && !toolCfg[f.key]?.trim());
      if (missing.length) throw new Error(`Fill required fields: ${missing.map(f => f.label).join(', ')}`);
      try {
        await bugTrackerService.push(activeTool, {
          title: '__BLAST_CONNECTION_TEST__', jiraFields: {}, criteria: {}, environment: {},
          objectives: {}, rootCause: {}, people: {}, tools: {}, risks: {},
          additionalDetails: {}, ticketType: 'Bug', severity: 'Low', priority: 'P3',
        }, toolCfg);
        setTestState('ok');
        setTestMsg('Connected!');
      } catch (e) {
        const authPassed = /project|field|invalid|400|422|not found|does not exist|badrequest/i.test(e.message);
        if (authPassed) { setTestState('ok'); setTestMsg('Connected — credentials valid'); }
        else throw e;
      }
    } catch (err) {
      setTestState('error');
      setTestMsg(err.message);
    }
  };

  const handleSubmit = async () => {
    if (!activeTool) { setError('Select a bug tracking tool first.'); return; }
    const toolCfg = getToolCfg();
    const tool = BT_TOOLS[activeTool];
    const missing = tool.fields.filter(f => !f.label.toLowerCase().includes('optional') && !toolCfg[f.key]?.trim());
    if (missing.length) { setError(`Fill required connection fields: ${missing.map(f => f.label).join(', ')}`); setShowCreds(true); return; }
    if (!title.trim()) { setError('Title is required.'); return; }

    setLoading(true);
    setError('');
    try {
      const ticket = buildTicket(tc, { title, severity, priority, stepsToReproduce, actualResult, environment, buildVersion });
      const res = await bugTrackerService.push(activeTool, ticket, toolCfg);
      setResult(res);
      onDefectCreated(tc.testCaseId, res.id, res.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tool = BT_TOOLS[activeTool];

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cdm-header">
          <div>
            <h3 className="cdm-title">🐛 Create Defect</h3>
            <p className="cdm-subtitle"><code>{tc.testCaseId}</code> — {tc.summary}</p>
          </div>
          <button className="cdm-close" onClick={onClose}>✕</button>
        </div>

        <div className="cdm-body">

          {result ? (
            /* ── Success state ────────────────────────────── */
            <div className="cdm-success">
              <div className="cdm-success-icon">✅</div>
              <div className="cdm-success-text">
                <strong>Defect created successfully!</strong>
                <p>
                  Ticket{' '}
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="cdm-ticket-link">
                    {result.id}
                  </a>{' '}
                  has been created in {tool?.name}.
                </p>
                <p className="cdm-defect-id-note">Defect ID saved to test case row.</p>
              </div>
              <div className="cdm-success-actions">
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="cdm-open-btn">
                  Open in {tool?.name} ↗
                </a>
                <button className="cdm-done-btn" onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Tool selector ──────────────────────────── */}
              <div className="cdm-section">
                <div className="cdm-section-label">Bug Tracking Tool</div>
                <div className="cdm-tool-row">
                  {Object.values(BT_TOOLS).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`cdm-tool-btn ${activeTool === t.id ? 'active' : ''}`}
                      style={activeTool === t.id ? { borderColor: t.color, color: t.color } : {}}
                      onClick={() => selectTool(t.id)}
                    >
                      <span className="cdm-tool-icon">{t.icon}</span>
                      <span className="cdm-tool-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTool && tool && (
                <>
                  {/* ── Connection settings (collapsible) ──── */}
                  <div className="cdm-section">
                    <button className="cdm-creds-toggle" onClick={() => setShowCreds(v => !v)}>
                      <span>{tool.icon} {tool.name} — Connection Settings</span>
                      <span className="cdm-creds-right">
                        {testState === 'ok' && <span className="cdm-badge-ok">● Connected</span>}
                        <span className="cdm-chevron">{showCreds ? '▲' : '▼'}</span>
                      </span>
                    </button>
                    {showCreds && (
                      <div className="cdm-creds-body">
                        {tool.fields.map(f => (
                          <div key={f.key} className="cdm-field">
                            <label>{f.label}</label>
                            <input
                              type={f.type === 'password' ? 'password' : 'text'}
                              placeholder={f.placeholder}
                              value={getToolCfg()[f.key] || ''}
                              onChange={e => updateCred(f.key, e.target.value)}
                            />
                            {f.hint && <small className="cdm-field-hint">{f.hint}</small>}
                          </div>
                        ))}
                        <button
                          className={`cdm-test-conn-btn ${testState === 'ok' ? 'ok' : testState === 'error' ? 'err' : ''}`}
                          onClick={handleTestConnection}
                          disabled={testState === 'testing'}
                        >
                          {testState === 'testing' ? '⏳ Testing…' : '🔌 Test Connection'}
                        </button>
                        {testMsg && (
                          <p className={`cdm-test-msg ${testState}`}>
                            {testState === 'ok' ? '✅' : '❌'} {testMsg}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Defect details form ─────────────────── */}
                  <div className="cdm-section">
                    <div className="cdm-section-label">Defect Details</div>

                    <div className="cdm-field">
                      <label>Title <span className="cdm-req">*</span></label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="cdm-row two-col">
                      <div className="cdm-field">
                        <label>Severity</label>
                        <select value={severity} onChange={e => setSeverity(e.target.value)}>
                          {['Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="cdm-field">
                        <label>Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)}>
                          <option value="P0">P0 — Blocker</option>
                          <option value="P1">P1 — Critical</option>
                          <option value="P2">P2 — Major</option>
                          <option value="P3">P3 — Minor</option>
                        </select>
                      </div>
                    </div>

                    <div className="cdm-row two-col">
                      <div className="cdm-field">
                        <label>Environment</label>
                        <input type="text" value={environment} onChange={e => setEnvironment(e.target.value)} placeholder="e.g. QA, Staging, UAT" />
                      </div>
                      <div className="cdm-field">
                        <label>Build / Version</label>
                        <input type="text" value={buildVersion} onChange={e => setBuildVersion(e.target.value)} placeholder="e.g. v2.4.1" />
                      </div>
                    </div>

                    <div className="cdm-field">
                      <label>Steps to Reproduce</label>
                      <textarea
                        rows={4}
                        value={stepsToReproduce}
                        onChange={e => setStepsToReproduce(e.target.value)}
                        placeholder={"1. Navigate to...\n2. Click...\n3. Observe the issue"}
                      />
                    </div>

                    <div className="cdm-field">
                      <label>Expected Result</label>
                      <div className="cdm-readonly expected">{tc.expectedResult || '—'}</div>
                    </div>

                    <div className="cdm-field">
                      <label>Actual Result — Bug Description <span className="cdm-req">*</span></label>
                      <textarea
                        rows={3}
                        value={actualResult}
                        onChange={e => setActualResult(e.target.value)}
                        placeholder="Describe what actually happened when the test case was executed..."
                        className="cdm-actual-ta"
                      />
                    </div>
                  </div>

                  {error && <div className="cdm-error">⚠️ {error}</div>}

                  <div className="cdm-footer">
                    <button className="cdm-cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="cdm-submit-btn" onClick={handleSubmit} disabled={loading}>
                      {loading
                        ? <><span className="cdm-spinner" /> Creating…</>
                        : <>{tool.icon} Create in {tool.name}</>
                      }
                    </button>
                  </div>
                </>
              )}

              {!activeTool && (
                <p className="cdm-no-tool-hint">Select a bug tracking tool above to continue.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
