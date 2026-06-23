/**
 * TestPlanDisplay.jsx
 * Enterprise tabbed display for the full 13-section test plan
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import '../styles/TestPlanDisplay.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'scope', label: 'Scope', icon: '🎯' },
  { id: 'testcases', label: 'Test Cases', icon: '🧪' },
  { id: 'strategy', label: 'Strategy', icon: '🗺️' },
  { id: 'environments', label: 'Environments', icon: '🖥️' },
  { id: 'defects', label: 'Defect Mgmt', icon: '🐛' },
  { id: 'risks', label: 'Risks', icon: '⚠️' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'deliverables', label: 'Deliverables', icon: '📦' },
];

const TC_TABS = [
  { id: 'positive', label: 'Positive', color: '#22c55e', icon: '✅' },
  { id: 'negative', label: 'Negative', color: '#ef4444', icon: '❌' },
  { id: 'edge', label: 'Edge Cases', color: '#f59e0b', icon: '⚡' },
  { id: 'security', label: 'Security', color: '#8b5cf6', icon: '🔒' },
  { id: 'performance', label: 'Performance', color: '#3b82f6', icon: '📊' },
  { id: 'accessibility', label: 'Accessibility', color: '#06b6d4', icon: '♿' },
];

const PRIORITY_COLORS = { P0: '#dc2626', P1: '#d97706', P2: '#2563eb', P3: '#6b7280' };
const RISK_COLORS = { High: '#dc2626', Medium: '#d97706', Low: '#22c55e' };

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || '#6b7280';
  return <span className="priority-badge" style={{ background: color }}>{priority || 'P1'}</span>;
}

function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || '#6b7280';
  return <span className="risk-badge" style={{ background: color }}>{level || 'Medium'}</span>;
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`section-card ${className}`}>
      {title && <h3 className="section-card-title">{title}</h3>}
      {children}
    </div>
  );
}

function TestCaseCard({ tc, color }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="tc-card" style={{ borderLeftColor: color }}>
      <div className="tc-header" onClick={() => setExpanded(!expanded)}>
        <div className="tc-header-left">
          <span className="tc-id" style={{ color }}>{tc.id}</span>
          <span className="tc-title">{tc.title}</span>
        </div>
        <div className="tc-header-right">
          <PriorityBadge priority={tc.priority} />
          {tc.module && <span className="tc-module">{tc.module}</span>}
          <span className="tc-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="tc-body">
          {tc.testTechnique && (
            <div className="tc-row"><span className="tc-label">Technique:</span><span className="tc-tech">{tc.testTechnique}</span></div>
          )}
          {tc.preconditions && tc.preconditions.length > 0 && (
            <div className="tc-section">
              <div className="tc-label">Preconditions:</div>
              <ul className="tc-list">
                {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {tc.steps && tc.steps.length > 0 && (
            <div className="tc-section">
              <div className="tc-label">Test Steps:</div>
              <ol className="tc-steps-list">
                {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
          <div className="tc-expected">
            <span className="tc-label">Expected Result:</span>
            <span>{tc.expectedResult || tc.expected || 'N/A'}</span>
          </div>
          {tc.testData && (
            <div className="tc-testdata">
              <span className="tc-label">Test Data:</span>
              <code>{tc.testData}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestPlanDisplay({ testPlan }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeTcTab, setActiveTcTab] = useState('positive');
  const displayRef = useRef(null);

  if (!testPlan) return null;

  const { metadata, objective, scope, testEnvironments, defectManagement, testStrategy,
    schedule, deliverables, entryExitCriteria, tools, risks, scenarios, totalTestCases, teamRoles } = testPlan;

  const meta = metadata || testPlan.testPlan || {};

  // Count per category
  const counts = {
    positive: scenarios?.positive?.length || 0,
    negative: scenarios?.negative?.length || 0,
    edge: scenarios?.edge?.length || 0,
    security: scenarios?.security?.length || 0,
    performance: scenarios?.performance?.length || 0,
    accessibility: scenarios?.accessibility?.length || 0,
  };

  const handleExport = (format) => {
    const productName = meta.productName || testPlan.summary || 'TestPlan';
    const filename = `TestPlan_${productName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(testPlan, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `${filename}.json`);
    } else if (format === 'markdown') {
      const md = buildMarkdown(testPlan);
      const blob = new Blob([md], { type: 'text/markdown' });
      triggerDownload(blob, `${filename}.md`);
    } else if (format === 'print') {
      window.print();
    } else if (format === 'excel') {
      handleExportExcel(productName, filename);
    }
  };

  const handleExportExcel = (productName, filename) => {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Overview ───────────────────────────────────
    const overviewRows = [
      [`Test Plan — ${productName}`], [],
      ['Product Name',  meta.productName || testPlan.summary || ''],
      ['Version',       meta.productVersion || '1.0'],
      ['Product Type',  meta.productType || testPlan.productType || ''],
      ['Test Lead',     meta.testLead || 'QA Team'],
      ['Status',        meta.status || 'Draft'],
      ['Generated At',  new Date(testPlan.generatedAt).toLocaleString()], [],
      ['Objective',     objective?.purposeStatement || ''], [],
      ['Total Test Cases', counts.positive + counts.negative + counts.edge + counts.security + counts.performance + counts.accessibility],
      ['Positive',      counts.positive],
      ['Negative',      counts.negative],
      ['Edge Cases',    counts.edge],
      ['Security',      counts.security],
      ['Performance',   counts.performance],
      ['Accessibility', counts.accessibility],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), 'Overview');

    // ── Sheet 2: All Test Cases ─────────────────────────────
    const tcHeaders = ['ID', 'Category', 'Title', 'Module', 'Priority', 'Technique', 'Preconditions', 'Steps', 'Expected Result', 'Test Data'];
    const tcRows = [tcHeaders];
    [
      { key: 'positive',      label: 'Positive'      },
      { key: 'negative',      label: 'Negative'      },
      { key: 'edge',          label: 'Edge Case'     },
      { key: 'security',      label: 'Security'      },
      { key: 'performance',   label: 'Performance'   },
      { key: 'accessibility', label: 'Accessibility' },
    ].forEach(({ key, label }) => {
      (scenarios?.[key] || []).forEach(tc => {
        tcRows.push([
          tc.id,
          label,
          tc.title,
          tc.module || '',
          tc.priority,
          tc.testTechnique || '',
          (tc.preconditions || []).join('\n'),
          (tc.steps || []).join('\n'),
          tc.expectedResult || '',
          tc.testData || '',
        ]);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tcRows), 'Test Cases');

    // ── Sheet 3: Risks ──────────────────────────────────────
    const riskRows = [
      ['ID', 'Description', 'Probability', 'Impact', 'Risk Score', 'Mitigation', 'Contingency', 'Owner'],
      ...(risks || []).map(r => [r.id, r.description, r.probability, r.impact, r.riskScore, r.mitigation, r.contingency || '', r.owner]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(riskRows), 'Risks');

    // ── Sheet 4: Schedule ───────────────────────────────────
    const schedRows = [
      ['Milestone', 'Week', 'Criteria', 'Status'],
      ...(schedule?.milestones || []).map(m => [m.milestone, m.week, m.criteria, m.status]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(schedRows), 'Schedule');

    // ── Sheet 5: Deliverables ───────────────────────────────
    const delRows = [
      ['Deliverable', 'Owner', 'Format', 'Audience'],
      ...(deliverables?.documents || []).map(d =>
        typeof d === 'string' ? [d, '', '', ''] : [d.deliverable || d, d.owner || '', d.format || '', d.audience || '']
      ),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(delRows), 'Deliverables');

    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="test-plan-display" ref={displayRef} id="test-plan-printable">

      {/* Stats Header */}
      <div className="plan-stats-header">
        <div className="plan-meta-info">
          <h2 className="plan-product-name">{meta.productName || testPlan.summary}</h2>
          <div className="plan-meta-tags">
            <span className="meta-tag">v{meta.productVersion || '1.0'}</span>
            <span className="meta-tag status-draft">{meta.status || 'Draft'}</span>
            <span className="meta-tag">{meta.productType || testPlan.productType || 'Product'}</span>
            <span className="meta-tag">Generated {new Date(testPlan.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="plan-stats-grid">
          <div className="stat-card total"><div className="stat-number">{totalTestCases || 0}</div><div className="stat-label">Total Test Cases</div></div>
          <div className="stat-card positive"><div className="stat-number">{counts.positive}</div><div className="stat-label">Positive</div></div>
          <div className="stat-card negative"><div className="stat-number">{counts.negative}</div><div className="stat-label">Negative</div></div>
          <div className="stat-card edge"><div className="stat-number">{counts.edge}</div><div className="stat-label">Edge Cases</div></div>
          <div className="stat-card security"><div className="stat-number">{counts.security}</div><div className="stat-label">Security</div></div>
          <div className="stat-card performance"><div className="stat-number">{counts.performance}</div><div className="stat-label">Performance</div></div>
          <div className="stat-card accessibility"><div className="stat-number">{counts.accessibility}</div><div className="stat-label">Accessibility</div></div>
        </div>
        {/* Export */}
        <div className="export-bar">
          <span className="export-label">Download:</span>
          <button className="export-btn excel-btn" onClick={() => handleExport('excel')}>📊 Excel</button>
          <button className="export-btn md-btn" onClick={() => handleExport('markdown')}>📄 Markdown</button>
          <button className="export-btn json-btn" onClick={() => handleExport('json')}>⚙️ JSON</button>
          <button className="export-btn print-btn" onClick={() => handleExport('print')}>🖨️ Print / PDF</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="plan-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`plan-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="plan-tab-content">

        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <div className="tab-pane">
            <div className="two-col-grid">
              <SectionCard title="📋 Plan Metadata">
                <table className="info-table">
                  <tbody>
                    <tr><td>Product</td><td><strong>{meta.productName}</strong></td></tr>
                    <tr><td>Version</td><td>{meta.productVersion || '1.0'}</td></tr>
                    <tr><td>Product Type</td><td>{meta.productType || testPlan.productType}</td></tr>
                    <tr><td>Risk Level</td><td><RiskBadge level={meta.riskLevel} /></td></tr>
                    <tr><td>Status</td><td><span className="status-badge">{meta.status || 'Draft'}</span></td></tr>
                    <tr><td>Test Lead</td><td>{meta.testLead || 'QA Team'}</td></tr>
                    <tr><td>Organisation</td><td>{meta.organization || 'B.L.A.S.T. Framework'}</td></tr>
                    <tr><td>Created</td><td>{meta.createdDate}</td></tr>
                    <tr><td>Estimated Effort</td><td>{meta.estimatedEffort || '3–4 weeks'}</td></tr>
                    <tr><td>Reference</td><td><code>{meta.issueReference || testPlan.issueKey}</code></td></tr>
                  </tbody>
                </table>
              </SectionCard>

              <SectionCard title="🎯 Objective">
                <p className="purpose-statement">{objective?.purposeStatement || 'N/A'}</p>
                <div className="audience-grid">
                  <div className="audience-item"><label>Primary Users</label><p>{objective?.targetAudience?.primary}</p></div>
                  <div className="audience-item"><label>Secondary Users</label><p>{objective?.targetAudience?.secondary}</p></div>
                  <div className="audience-item"><label>Tertiary Users</label><p>{objective?.targetAudience?.tertiary}</p></div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="✅ Success Criteria">
              <div className="criteria-grid">
                {(objective?.successCriteria || []).map((c, i) => (
                  <div key={i} className="criteria-item">
                    <span className="criteria-check">✓</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {(objective?.qualityGoals || []).length > 0 && (
              <SectionCard title="🏆 Quality Goals">
                <ul className="quality-goals-list">
                  {objective.qualityGoals.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </SectionCard>
            )}

            {(teamRoles || []).length > 0 && (
              <SectionCard title="👥 Team Roles & Responsibilities">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Role</th><th>Responsibilities</th><th>Hours/Week</th></tr></thead>
                    <tbody>
                      {teamRoles.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.role}</strong></td>
                          <td>{r.responsibilities}</td>
                          <td>{r.hoursPerWeek}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ===== SCOPE ===== */}
        {activeTab === 'scope' && (
          <div className="tab-pane">
            <SectionCard title="✅ In Scope — Features to Test">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Feature / Module</th><th>Description</th><th>Priority</th><th>Testing Type</th><th>Risk</th></tr></thead>
                  <tbody>
                    {(scope?.inScope || []).map((f, i) => (
                      <tr key={i}>
                        <td><strong>{f.feature}</strong></td>
                        <td>{f.description}</td>
                        <td><PriorityBadge priority={f.priority} /></td>
                        <td>{f.testingType}</td>
                        <td><RiskBadge level={f.riskLevel} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="two-col-grid">
              <SectionCard title="🚫 Out of Scope">
                <ul className="oos-list">
                  {(scope?.outOfScope || []).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </SectionCard>

              <SectionCard title="🧪 Testing Types">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Type</th><th>Duration</th><th>Priority</th><th>Tools</th></tr></thead>
                    <tbody>
                      {(scope?.testingTypes || []).filter(t => t.include).map((t, i) => (
                        <tr key={i}>
                          <td>{t.type}</td>
                          <td>{t.duration}</td>
                          <td><PriorityBadge priority={t.priority} /></td>
                          <td><code>{t.tools}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="🌐 Test Environments">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Environment</th><th>Included?</th><th>Browsers</th><th>Details</th></tr></thead>
                  <tbody>
                    {(scope?.environments || []).map((e, i) => (
                      <tr key={i}>
                        <td><strong>{e.environment}</strong></td>
                        <td>{e.include ? '☑ Yes' : '☐ No'}</td>
                        <td>{e.browsers}</td>
                        <td>{e.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== TEST CASES ===== */}
        {activeTab === 'testcases' && (
          <div className="tab-pane">
            {/* TC Sub-tabs */}
            <div className="tc-tabs">
              {TC_TABS.map((t) => {
                const count = counts[t.id] || 0;
                return (
                  <button
                    key={t.id}
                    className={`tc-tab ${activeTcTab === t.id ? 'active' : ''}`}
                    style={activeTcTab === t.id ? { borderBottomColor: t.color, color: t.color } : {}}
                    onClick={() => setActiveTcTab(t.id)}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                    <span className="tc-count" style={{ background: t.color }}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="tc-list-container">
              {TC_TABS.filter(t => t.id === activeTcTab).map(tcTab => {
                const cases = scenarios?.[tcTab.id] || [];
                return (
                  <div key={tcTab.id}>
                    <div className="tc-category-header" style={{ borderLeftColor: tcTab.color }}>
                      <h3 style={{ color: tcTab.color }}>{tcTab.icon} {tcTab.label} Test Cases</h3>
                      <span className="tc-total-count">{cases.length} cases</span>
                    </div>
                    {cases.length === 0 ? (
                      <div className="tc-empty">No {tcTab.label.toLowerCase()} test cases generated. Regenerate with a more detailed requirements description.</div>
                    ) : (
                      cases.map((tc) => (
                        <TestCaseCard key={tc.id} tc={tc} color={tcTab.color} />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== STRATEGY ===== */}
        {activeTab === 'strategy' && (
          <div className="tab-pane">
            <SectionCard title="🗺️ Testing Approach">
              <p className="approach-text">{testStrategy?.approach || 'Risk-based testing with shift-left quality principles.'}</p>
            </SectionCard>

            <SectionCard title="🔬 Test Design Techniques">
              <div className="techniques-grid">
                {(testStrategy?.techniques || []).map((t, i) => (
                  <div key={i} className="technique-card">
                    <h4>{t.name}</h4>
                    <p>{t.description}</p>
                    <div className="technique-applies"><label>Applies to:</label> {t.applicableTo}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {testStrategy?.automationStrategy && (
              <SectionCard title="🤖 Automation Strategy">
                <div className="auto-grid">
                  {Object.entries(testStrategy.automationStrategy).map(([k, v]) => (
                    <div key={k} className="auto-item">
                      <label>{k.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="📅 Testing Phases">
              <div className="phases-list">
                {(testStrategy?.phases || []).map((p, i) => (
                  <div key={i} className="phase-card">
                    <div className="phase-number">{i + 1}</div>
                    <div className="phase-content">
                      <h4>{p.phase}</h4>
                      <div className="phase-meta">
                        <span className="phase-duration">⏱️ {p.duration}</span>
                      </div>
                      <p className="phase-objective">{p.objective}</p>
                      <div className="phase-criteria">
                        <div className="criteria-col"><label>Entry:</label><p>{p.entryCriteria}</p></div>
                        <div className="criteria-col"><label>Exit:</label><p>{p.exitCriteria}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {entryExitCriteria && (
              <SectionCard title="🚦 Entry / Exit Criteria">
                {Object.entries(entryExitCriteria).map(([phase, criteria]) => (
                  <div key={phase} className="eec-block">
                    <h4 className="eec-phase">{phase.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <div className="two-col-grid">
                      <div>
                        <label className="eec-label entry">✅ Entry Criteria</label>
                        <ul>{(criteria.entry || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                      </div>
                      <div>
                        <label className="eec-label exit">🏁 Exit Criteria</label>
                        <ul>{(criteria.exit || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* ===== ENVIRONMENTS ===== */}
        {activeTab === 'environments' && (
          <div className="tab-pane">
            <div className="two-col-grid">
              <SectionCard title="🖥️ Operating Systems">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>OS</th><th>Version</th><th>Priority</th><th>Included</th></tr></thead>
                    <tbody>
                      {(testEnvironments?.operatingSystems || []).map((os, i) => (
                        <tr key={i}>
                          <td>{os.os}</td>
                          <td>{os.version}</td>
                          <td><RiskBadge level={os.priority} /></td>
                          <td>{os.included ? '☑ Yes' : '☐ No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="🌐 Browsers">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Browser</th><th>Versions</th><th>Desktop</th><th>Mobile</th><th>Priority</th></tr></thead>
                    <tbody>
                      {(testEnvironments?.browsers || []).map((b, i) => (
                        <tr key={i}>
                          <td>{b.browser}</td>
                          <td>{b.versions}</td>
                          <td>{b.desktop ? '☑' : '☐'}</td>
                          <td>{b.mobile ? '☑' : '☐'}</td>
                          <td><RiskBadge level={b.priority} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="📶 Network Conditions">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Network Type</th><th>Speed</th><th>Latency</th><th>Test?</th></tr></thead>
                  <tbody>
                    {(testEnvironments?.networkConditions || []).map((n, i) => (
                      <tr key={i}>
                        <td>{n.type}</td>
                        <td>{n.speed}</td>
                        <td>{n.latency}</td>
                        <td>{n.test ? '☑ Yes' : '☐ No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {testEnvironments?.securityRequirements && (
              <SectionCard title="🔐 Security & Data Policy">
                <div className="security-grid">
                  <div>
                    <label>Authentication Methods</label>
                    <ul>{(testEnvironments.securityRequirements.authentication || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
                  </div>
                  <div>
                    <label>Data Security</label>
                    <ul>{(testEnvironments.securityRequirements.dataSecurity || []).map((d, i) => <li key={i}>{d}</li>)}</ul>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label>Test Data Policy</label>
                    <p className="policy-text">{testEnvironments.securityRequirements.testDataPolicy}</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ===== DEFECT MANAGEMENT ===== */}
        {activeTab === 'defects' && (
          <div className="tab-pane">
            <div className="two-col-grid">
              <SectionCard title="🔴 Severity Levels">
                {(defectManagement?.severityLevels || []).map((s, i) => (
                  <div key={i} className="severity-card">
                    <div className="severity-header">
                      <span className={`severity-badge sev-${s.severity?.toLowerCase()}`}>{s.severity}</span>
                      <span className="severity-sla">SLA: {s.resolutionSLA}</span>
                    </div>
                    <p className="severity-def">{s.definition}</p>
                    {s.examples && <p className="severity-examples"><strong>Examples:</strong> {s.examples}</p>}
                    <p className="severity-impact"><strong>Impact:</strong> {s.impact}</p>
                  </div>
                ))}
              </SectionCard>

              <SectionCard title="📌 Priority Levels">
                {(defectManagement?.priorityLevels || []).map((p, i) => (
                  <div key={i} className="priority-card">
                    <div className="priority-header">
                      <span className="priority-name">{p.priority}</span>
                      <span className="priority-fix">{p.fixTimeline}</span>
                    </div>
                    <p>{p.definition}</p>
                  </div>
                ))}
              </SectionCard>
            </div>

            {defectManagement?.escalationPath && (
              <SectionCard title="📢 Escalation Path">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Priority</th><th>Escalate To</th><th>Time Limit</th></tr></thead>
                    <tbody>
                      {defectManagement.escalationPath.map((e, i) => (
                        <tr key={i}>
                          <td><PriorityBadge priority={e.priority} /></td>
                          <td>{e.escalateTo}</td>
                          <td>{e.timeLimit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            <SectionCard title="🛠️ Tracking Tool">
              <p><strong>Tool:</strong> {defectManagement?.trackingTool || 'JIRA'}</p>
            </SectionCard>
          </div>
        )}

        {/* ===== RISKS ===== */}
        {activeTab === 'risks' && (
          <div className="tab-pane">
            <div className="risks-grid">
              {(risks || []).map((r, i) => (
                <div key={i} className="risk-card">
                  <div className="risk-header">
                    <span className="risk-id">{r.id}</span>
                    <RiskBadge level={r.riskScore || r.impact} />
                  </div>
                  <h4>{r.description}</h4>
                  <div className="risk-meta">
                    <div><label>Probability</label><RiskBadge level={r.probability} /></div>
                    <div><label>Impact</label><RiskBadge level={r.impact} /></div>
                  </div>
                  <div className="risk-mitigation">
                    <label>Mitigation</label>
                    <p>{r.mitigation}</p>
                  </div>
                  {r.contingency && (
                    <div className="risk-contingency">
                      <label>Contingency</label>
                      <p>{r.contingency}</p>
                    </div>
                  )}
                  <div className="risk-owner"><label>Owner:</label> {r.owner}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SCHEDULE ===== */}
        {activeTab === 'schedule' && (
          <div className="tab-pane">
            <SectionCard title="📅 Project Timeline">
              <div className="timeline-header">
                <strong>Total Duration:</strong> {schedule?.totalDuration || '3–4 weeks'}
              </div>
              <div className="milestones-list">
                {(schedule?.milestones || []).map((m, i) => (
                  <div key={i} className="milestone-card">
                    <div className="milestone-week">{m.week}</div>
                    <div className="milestone-content">
                      <h4>{m.milestone}</h4>
                      <p>{m.criteria}</p>
                    </div>
                    <div className={`milestone-status status-${(m.status || 'Pending').toLowerCase()}`}>
                      {m.status || 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== DELIVERABLES ===== */}
        {activeTab === 'deliverables' && (
          <div className="tab-pane">
            <SectionCard title="📦 Test Deliverables">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Deliverable</th><th>Owner</th><th>Format</th><th>Audience</th></tr></thead>
                  <tbody>
                    {(deliverables?.documents || []).map((d, i) => (
                      <tr key={i}>
                        <td><strong>{d.deliverable}</strong></td>
                        <td>{d.owner}</td>
                        <td><code>{d.format}</code></td>
                        <td>{d.audience}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="📊 Quality Metrics Targets">
              <div className="metrics-grid">
                {Object.entries(deliverables?.metrics || {}).map(([k, v]) => (
                  <div key={k} className="metric-card">
                    <div className="metric-value">{v}</div>
                    <div className="metric-label">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="🛠️ Tools & Infrastructure">
              <div className="tools-grid">
                {Object.entries(tools || {}).map(([k, v]) => (
                  <div key={k} className="tool-item">
                    <label>{k.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

      </div>
    </div>
  );
}

// ===== MARKDOWN EXPORT =====
function buildMarkdown(plan) {
  const meta = plan.metadata || plan.testPlan || {};
  const { objective, scope, testStrategy, testEnvironments, defectManagement, risks, tools, deliverables, scenarios } = plan;

  let md = `# TEST PLAN: ${meta.productName || plan.summary}\n\n`;
  md += `**Product Version:** ${meta.productVersion || '1.0'}  \n`;
  md += `**Status:** ${meta.status || 'Draft'}  \n`;
  md += `**Test Lead:** ${meta.testLead || 'QA Team'}  \n`;
  md += `**Organisation:** ${meta.organization || 'B.L.A.S.T. Framework'}  \n`;
  md += `**Created:** ${meta.createdDate || new Date().toISOString().split('T')[0]}  \n`;
  md += `**Risk Level:** ${meta.riskLevel || 'High'}  \n`;
  md += `**Estimated Effort:** ${meta.estimatedEffort || '3–4 weeks'}  \n\n---\n\n`;

  md += `## 1. OBJECTIVE\n\n`;
  md += `${objective?.purposeStatement || ''}\n\n`;
  md += `### Success Criteria\n`;
  (objective?.successCriteria || []).forEach(c => { md += `- [ ] ${c}\n`; });
  md += '\n';

  md += `## 2. SCOPE\n\n### Features In Scope\n\n`;
  md += `| Feature | Description | Priority | Testing Type | Risk |\n|---|---|---|---|---|\n`;
  (scope?.inScope || []).forEach(f => {
    md += `| ${f.feature} | ${f.description} | ${f.priority} | ${f.testingType} | ${f.riskLevel} |\n`;
  });

  md += `\n### Out of Scope\n`;
  (scope?.outOfScope || []).forEach(o => { md += `- ${o}\n`; });

  md += `\n## 3. TEST CASES\n\n`;
  const categories = [
    { key: 'positive', title: 'Positive Scenarios' },
    { key: 'negative', title: 'Negative Scenarios' },
    { key: 'edge', title: 'Edge Cases' },
    { key: 'security', title: 'Security Tests' },
    { key: 'performance', title: 'Performance Tests' },
    { key: 'accessibility', title: 'Accessibility Tests' },
  ];
  categories.forEach(cat => {
    const cases = scenarios?.[cat.key] || [];
    if (cases.length === 0) return;
    md += `### ${cat.title} (${cases.length})\n\n`;
    cases.forEach(tc => {
      md += `**${tc.id}: ${tc.title}**  \n`;
      md += `- Module: ${tc.module || 'N/A'} | Priority: ${tc.priority || 'P1'} | Technique: ${tc.testTechnique || 'N/A'}\n`;
      if (tc.preconditions?.length) md += `- Preconditions: ${tc.preconditions.join('; ')}\n`;
      md += `\nSteps:\n`;
      (tc.steps || []).forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
      md += `\n**Expected Result:** ${tc.expectedResult || 'N/A'}\n\n`;
    });
  });

  md += `## 4. TEST STRATEGY\n\n${testStrategy?.approach || ''}\n\n`;
  md += `### Testing Phases\n\n`;
  (testStrategy?.phases || []).forEach(p => {
    md += `**${p.phase}** (${p.duration})\n- Objective: ${p.objective}\n- Entry: ${p.entryCriteria}\n- Exit: ${p.exitCriteria}\n\n`;
  });

  md += `## 5. TEST ENVIRONMENTS\n\n### Operating Systems\n\n`;
  md += `| OS | Version | Priority |\n|---|---|---|\n`;
  (testEnvironments?.operatingSystems || []).filter(o => o.included).forEach(o => {
    md += `| ${o.os} | ${o.version} | ${o.priority} |\n`;
  });

  md += `\n### Browsers\n\n| Browser | Versions | Desktop | Mobile |\n|---|---|---|---|\n`;
  (testEnvironments?.browsers || []).forEach(b => {
    md += `| ${b.browser} | ${b.versions} | ${b.desktop ? '✓' : '✗'} | ${b.mobile ? '✓' : '✗'} |\n`;
  });

  md += `\n## 6. DEFECT MANAGEMENT\n\n### Severity Levels\n\n`;
  md += `| Severity | Definition | SLA |\n|---|---|---|\n`;
  (defectManagement?.severityLevels || []).forEach(s => {
    md += `| **${s.severity}** | ${s.definition} | ${s.resolutionSLA} |\n`;
  });

  md += `\n## 7. RISKS\n\n`;
  (risks || []).forEach(r => {
    md += `### ${r.id} — ${r.description}\n`;
    md += `- **Probability:** ${r.probability} | **Impact:** ${r.impact} | **Risk Score:** ${r.riskScore}\n`;
    md += `- **Mitigation:** ${r.mitigation}\n`;
    if (r.contingency) md += `- **Contingency:** ${r.contingency}\n`;
    md += `- **Owner:** ${r.owner}\n\n`;
  });

  md += `## 8. TOOLS & INFRASTRUCTURE\n\n`;
  Object.entries(tools || {}).forEach(([k, v]) => {
    md += `- **${k.replace(/([A-Z])/g, ' $1').trim()}:** ${v}\n`;
  });

  md += `\n## 9. DELIVERABLES\n\n`;
  md += `| Deliverable | Owner | Format | Audience |\n|---|---|---|---|\n`;
  (deliverables?.documents || []).forEach(d => {
    md += `| ${d.deliverable} | ${d.owner} | ${d.format} | ${d.audience} |\n`;
  });

  md += `\n---\n\n*Generated by B.L.A.S.T. Framework Enterprise Test Plan Generator*  \n`;
  md += `*${new Date().toLocaleString()} — AI-powered by GROQ Llama 3.3 70B*\n`;
  return md;
}
