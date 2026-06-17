/**
 * TestStrategyDisplay.jsx
 * B.L.A.S.T. Framework — Enterprise Test Strategy tabbed display
 * Covers all 9 sections from Test_Strategy_Template.md
 * Supports: Markdown, JSON, and Print/PDF export
 */

import React, { useState } from 'react';
import '../styles/TestStrategy.css';

const TABS = [
  { id: 'overview',      label: 'Overview',        icon: '📋' },
  { id: 'scope',         label: 'Scope',            icon: '🎯' },
  { id: 'risks',         label: 'Risks',            icon: '⚠️' },
  { id: 'criteria',      label: 'Entry / Exit',     icon: '🚦' },
  { id: 'environment',   label: 'Environments',     icon: '🖥️' },
  { id: 'people',        label: 'People',           icon: '👥' },
  { id: 'tools',         label: 'Tools & Methods',  icon: '🛠️' },
  { id: 'schedule',      label: 'Schedule',         icon: '📅' },
  { id: 'deliverables',  label: 'Deliverables',     icon: '📦' },
];

const LIKELIHOOD_COLORS = { High: '#dc2626', Medium: '#d97706', Low: '#22c55e' };
const IMPACT_COLORS     = { High: '#dc2626', Medium: '#d97706', Low: '#22c55e' };

function Badge({ label, colorMap, fallback = '#6b7280' }) {
  const bg = colorMap[label] || fallback;
  return <span className="strat-badge" style={{ background: bg }}>{label}</span>;
}

function SectionCard({ title, children, accent }) {
  return (
    <div className="strat-section-card" style={accent ? { borderLeftColor: accent } : {}}>
      {title && <h3 className="strat-section-title">{title}</h3>}
      {children}
    </div>
  );
}

export default function TestStrategyDisplay({ strategy }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!strategy) return null;

  const {
    metadata = {},
    objectives = {},
    scope = {},
    risks = [],
    criteria = {},
    environment = {},
    people = {},
    toolsAndTechniques = {},
    schedule = {},
    deliverables = [],
    generatedAt,
  } = strategy;

  /* ── Export helpers ── */
  const handleExport = (format) => {
    const slug = (metadata.productName || 'TestStrategy').replace(/\s+/g, '_');
    const date = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(strategy, null, 2)], { type: 'application/json' });
      download(blob, `TestStrategy_${slug}_${date}.json`);
    } else if (format === 'markdown') {
      const blob = new Blob([buildMarkdown(strategy)], { type: 'text/markdown' });
      download(blob, `TestStrategy_${slug}_${date}.md`);
    } else if (format === 'print') {
      window.print();
    }
  };

  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="strat-display" id="strategy-printable">

      {/* ── Header ── */}
      <div className="strat-display-header">
        <div className="strat-meta-block">
          <h2 className="strat-product-name">{metadata.productName || 'Test Strategy'}</h2>
          <div className="strat-meta-tags">
            <span className="strat-meta-tag">v{metadata.productVersion || '1.0'}</span>
            <span className="strat-meta-tag strat-status-tag">{metadata.documentStatus || 'Draft'}</span>
            <span className="strat-meta-tag">{metadata.productType || 'Product'}</span>
            <span className="strat-meta-tag">IEEE 829 Aligned</span>
            <span className="strat-meta-tag">Generated {new Date(generatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="strat-stats-row">
          <div className="strat-stat-pill total">
            <span className="strat-stat-num">{scope.testLevels?.length || 10}</span>
            <span>Test Levels</span>
          </div>
          <div className="strat-stat-pill risk">
            <span className="strat-stat-num">{risks.length}</span>
            <span>Risks Identified</span>
          </div>
          <div className="strat-stat-pill env">
            <span className="strat-stat-num">{environment.environments?.length || 5}</span>
            <span>Environments</span>
          </div>
          <div className="strat-stat-pill phase">
            <span className="strat-stat-num">{criteria.phases?.length || 6}</span>
            <span>Test Phases</span>
          </div>
          <div className="strat-stat-pill deliv">
            <span className="strat-stat-num">{deliverables.length}</span>
            <span>Deliverables</span>
          </div>
        </div>

        {/* Export bar */}
        <div className="export-bar">
          <span className="export-label">Download As:</span>
          <button className="export-btn md-btn"    onClick={() => handleExport('markdown')}>📄 Markdown</button>
          <button className="export-btn json-btn"  onClick={() => handleExport('json')}>⚙️ JSON</button>
          <button className="export-btn print-btn" onClick={() => handleExport('print')}>🖨️ Print / PDF</button>
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="strat-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`strat-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="strat-tab-content">

        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <div className="tab-pane">
            <div className="two-col-grid">
              {/* Metadata table */}
              <SectionCard title="📋 Document Metadata">
                <table className="info-table">
                  <tbody>
                    <tr><td>Product</td><td><strong>{metadata.productName}</strong></td></tr>
                    <tr><td>Version</td><td>{metadata.productVersion || '1.0'}</td></tr>
                    <tr><td>Product Type</td><td>{metadata.productType}</td></tr>
                    <tr><td>Status</td><td><span className="status-badge">{metadata.documentStatus || 'Draft'}</span></td></tr>
                    <tr><td>Prepared By</td><td>{metadata.preparedBy || 'QA Team'}</td></tr>
                    <tr><td>Role</td><td>{metadata.role || 'Senior QA Test Architect'}</td></tr>
                    <tr><td>Date</td><td>{metadata.date}</td></tr>
                    <tr><td>Sprint Cadence</td><td>{metadata.sprintCadence || '2-week sprints'}</td></tr>
                    <tr><td>Project Timeline</td><td>{metadata.projectTimeline || 'TBD'}</td></tr>
                    <tr><td>Team Composition</td><td>{metadata.teamComposition || 'TBD'}</td></tr>
                  </tbody>
                </table>
              </SectionCard>

              {/* Variables confirmed */}
              <SectionCard title="✅ Variables Confirmed">
                <div className="var-grid">
                  <div className="var-row">
                    <label>Business Objective</label>
                    <p>{metadata.businessObjective || 'TBD — confirm with stakeholder'}</p>
                  </div>
                  <div className="var-row">
                    <label>Automation Tooling</label>
                    <p>{(metadata.automationTooling || []).join(', ') || 'Playwright, REST Assured'}</p>
                  </div>
                  <div className="var-row">
                    <label>Load / Perf Tooling</label>
                    <p>{(metadata.loadPerfTooling || []).join(', ') || 'k6, Grafana'}</p>
                  </div>
                  <div className="var-row">
                    <label>Security Standards</label>
                    <p>{(metadata.securityStandards || []).join(', ') || 'OWASP Top 10 2021'}</p>
                  </div>
                  <div className="var-row">
                    <label>Browsers / Devices</label>
                    <p>{(metadata.browsersDevices || []).join(', ') || 'Chrome, Firefox, Safari, Edge, iOS, Android'}</p>
                  </div>
                  <div className="var-row">
                    <label>Third-Party Services</label>
                    <p>{(metadata.thirdPartyServices || []).join(', ') || 'TBD'}</p>
                  </div>
                  <div className="var-row">
                    <label>Usability Panel</label>
                    <p>{metadata.usabilityPanelSize || '8 participants'}</p>
                  </div>
                </div>
                <div className="open-items-note">
                  Any field showing "TBD" is an <strong>open item requiring stakeholder input</strong> before this document is finalised.
                </div>
              </SectionCard>
            </div>

            {/* Objectives */}
            <SectionCard title="🎯 Section 1 — Objectives">
              <div className="objective-primary">
                <label>Primary Test Objective</label>
                <p className="purpose-statement">{objectives.primaryObjective}</p>
              </div>
              <div className="two-col-grid" style={{ marginTop: 16 }}>
                <div>
                  <label className="sub-label">Quality Goals</label>
                  <div className="quality-goals-list">
                    {Object.entries(objectives.qualityGoals || {}).map(([k, v]) => (
                      <div key={k} className="qgoal-item">
                        <span className="qgoal-icon">◆</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="sub-label">Success Metrics for Sign-Off</label>
                  <ul className="success-metrics-list">
                    {(objectives.successMetrics || []).map((m, i) => (
                      <li key={i}><span className="check-icon">✓</span>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== SCOPE ===== */}
        {activeTab === 'scope' && (
          <div className="tab-pane">
            <div className="two-col-grid">
              <SectionCard title="✅ In-Scope Workflows" accent="#22c55e">
                <ul className="scope-list in-scope">
                  {(scope.inScopeWorkflows || []).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </SectionCard>
              <SectionCard title="🚫 Out of Scope" accent="#ef4444">
                <ul className="scope-list out-scope">
                  {(scope.outOfScope || []).map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </SectionCard>
            </div>

            <SectionCard title="📦 In-Scope Modules">
              <div className="modules-flex">
                {(scope.inScopeModules || []).map((m, i) => (
                  <span key={i} className="module-chip">{m}</span>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="🧪 Test Levels in Scope">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Test Level</th>
                      <th>Owner</th>
                      <th>Coverage Target</th>
                      <th>Tooling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scope.testLevels || []).map((tl, i) => (
                      <tr key={i}>
                        <td><strong>{tl.level}</strong></td>
                        <td>{tl.owner}</td>
                        <td>{tl.coverageTarget}</td>
                        <td><code>{tl.tooling}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <span className="risk-num">R{String(i + 1).padStart(3, '0')}</span>
                    <div className="risk-badges">
                      <div><label>Likelihood</label><Badge label={r.likelihood} colorMap={LIKELIHOOD_COLORS} /></div>
                      <div><label>Impact</label><Badge label={r.impact} colorMap={IMPACT_COLORS} /></div>
                    </div>
                  </div>
                  <h4 className="risk-desc">{r.risk}</h4>
                  <div className="risk-mitigation">
                    <label>Mitigation</label>
                    <p>{r.mitigation}</p>
                  </div>
                  <div className="risk-owner">
                    <label>Owner:</label> <span>{r.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ENTRY / EXIT CRITERIA ===== */}
        {activeTab === 'criteria' && (
          <div className="tab-pane">
            <SectionCard title="🚦 Section 4 — Entry / Exit Criteria by Phase">
              <div className="table-wrap">
                <table className="data-table criteria-table">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th className="entry-col">✅ Entry Criteria</th>
                      <th className="exit-col">🏁 Exit Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(criteria.phases || []).map((p, i) => (
                      <tr key={i}>
                        <td><strong>{p.phase}</strong></td>
                        <td className="entry-col">{p.entryCriteria}</td>
                        <td className="exit-col">{p.exitCriteria}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="two-col-grid">
              <SectionCard title="⛔ Suspension Criteria" accent="#ef4444">
                <p className="criteria-text">{criteria.suspensionCriteria}</p>
              </SectionCard>
              <SectionCard title="▶️ Resumption Criteria" accent="#22c55e">
                <p className="criteria-text">{criteria.resumptionCriteria}</p>
              </SectionCard>
            </div>
          </div>
        )}

        {/* ===== ENVIRONMENT ===== */}
        {activeTab === 'environment' && (
          <div className="tab-pane">
            <SectionCard title="🖥️ Section 5 — Test Environments">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Environment</th>
                      <th>Purpose</th>
                      <th>Data Strategy</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(environment.environments || []).map((env, i) => (
                      <tr key={i}>
                        <td><strong>{env.name}</strong></td>
                        <td>{env.purpose}</td>
                        <td>{env.dataStrategy}</td>
                        <td>{env.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="🔗 Third-Party / Sandbox Dependencies">
              <p className="criteria-text">{environment.thirdPartyDependencies}</p>
            </SectionCard>
          </div>
        )}

        {/* ===== PEOPLE ===== */}
        {activeTab === 'people' && (
          <div className="tab-pane">
            <SectionCard title="👥 Section 6 — Team Roles & Responsibilities">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Name / TBD</th>
                      <th>Responsibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(people.roles || []).map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.role}</strong></td>
                        <td><span className="tbd-chip">{r.name || 'TBD'}</span></td>
                        <td>{r.responsibility}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="two-col-grid">
              <SectionCard title="👤 Team Size & Duration" accent="#6366f1">
                <p className="criteria-text">{people.teamSize}</p>
              </SectionCard>
              <SectionCard title="📢 Escalation Path" accent="#f59e0b">
                <p className="criteria-text">{people.escalationPath}</p>
              </SectionCard>
            </div>
          </div>
        )}

        {/* ===== TOOLS & TECHNIQUES ===== */}
        {activeTab === 'tools' && (
          <div className="tab-pane">
            <SectionCard title="🔬 Test Design Techniques">
              <div className="techniques-flex">
                {(toolsAndTechniques.testDesignTechniques || []).map((t, i) => (
                  <div key={i} className="technique-pill">
                    <span className="tech-bullet">◆</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="two-col-grid">
              <SectionCard title="🤖 Automation Stack" accent="#6366f1">
                <p className="tool-detail">{toolsAndTechniques.automationStack}</p>
              </SectionCard>
              <SectionCard title="📊 Performance Tooling" accent="#3b82f6">
                <p className="tool-detail">{toolsAndTechniques.performanceTooling}</p>
              </SectionCard>
              <SectionCard title="🔒 Security Tooling / Standards" accent="#8b5cf6">
                <p className="tool-detail">{toolsAndTechniques.securityTooling}</p>
              </SectionCard>
              <SectionCard title="🌐 Compatibility Matrix Tooling" accent="#06b6d4">
                <p className="tool-detail">{toolsAndTechniques.compatibilityTooling}</p>
              </SectionCard>
            </div>

            <SectionCard title="📋 Test Management / Defect Tracking" accent="#f59e0b">
              <p className="tool-detail">{toolsAndTechniques.testManagement}</p>
            </SectionCard>
          </div>
        )}

        {/* ===== SCHEDULE ===== */}
        {activeTab === 'schedule' && (
          <div className="tab-pane">
            <SectionCard title="📅 Section 8 — Schedule">
              <div className="schedule-meta">
                <div className="schedule-meta-item">
                  <label>Sprint Cadence</label>
                  <span>{schedule.sprintCadence}</span>
                </div>
                <div className="schedule-meta-item">
                  <label>Project Timeline</label>
                  <span>{schedule.projectTimeline}</span>
                </div>
              </div>

              <div className="phases-timeline">
                {(schedule.phases || []).map((p, i) => (
                  <div key={i} className="schedule-phase-card">
                    <div className="phase-number-badge">{i + 1}</div>
                    <div className="phase-body">
                      <div className="phase-header-row">
                        <h4>{p.phase}</h4>
                        <span className="phase-timeframe">⏱️ {p.timeframe}</span>
                      </div>
                      <p className="phase-activities">{p.activities}</p>
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
            <SectionCard title="📦 Section 9 — Deliverables">
              <div className="deliverables-grid">
                {(deliverables || []).map((d, i) => (
                  <div key={i} className="deliverable-card">
                    <span className="deliv-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="deliv-text">{d}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Quick export reminder */}
            <div className="export-reminder">
              <h4>Download this Test Strategy</h4>
              <p>All sections above are included in the export. Use the buttons below to download.</p>
              <div className="export-bar" style={{ marginTop: 12 }}>
                <button className="export-btn md-btn"    onClick={() => handleExport('markdown')}>📄 Download Markdown</button>
                <button className="export-btn json-btn"  onClick={() => handleExport('json')}>⚙️ Download JSON</button>
                <button className="export-btn print-btn" onClick={() => handleExport('print')}>🖨️ Print / Save PDF</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Markdown export builder ── */
function buildMarkdown(s) {
  const m = s.metadata || {};
  const o = s.objectives || {};
  const sc = s.scope || {};
  const cr = s.criteria || {};
  const env = s.environment || {};
  const ppl = s.people || {};
  const tt = s.toolsAndTechniques || {};
  const sch = s.schedule || {};

  let md = `# TEST STRATEGY DOCUMENT — ${m.productName || 'Product'}\n\n`;
  md += `**Document Status:** ${m.documentStatus || 'Draft'}\n`;
  md += `**Prepared By:** ${m.preparedBy || 'QA Team'} | **Role:** ${m.role || 'Senior QA Test Architect'}\n`;
  md += `**Date:** ${m.date || new Date().toISOString().split('T')[0]}\n\n---\n\n`;

  md += `## Variables Confirmed Before Finalising\n\n`;
  md += `| Variable | Value |\n|---|---|\n`;
  md += `| Product Name | ${m.productName || 'TBD'} |\n`;
  md += `| Business Objective | ${m.businessObjective || 'TBD'} |\n`;
  md += `| Project Timeline | ${m.projectTimeline || 'TBD'} |\n`;
  md += `| Sprint Cadence | ${m.sprintCadence || 'TBD'} |\n`;
  md += `| Team Composition | ${m.teamComposition || 'TBD'} |\n`;
  md += `| Automation Tooling | ${(m.automationTooling || []).join(', ') || 'TBD'} |\n`;
  md += `| Load / Perf Tooling | ${(m.loadPerfTooling || []).join(', ') || 'TBD'} |\n`;
  md += `| Security Standards | ${(m.securityStandards || []).join(', ') || 'TBD'} |\n`;
  md += `| Browsers / Devices | ${(m.browsersDevices || []).join(', ') || 'TBD'} |\n`;
  md += `| Third-Party Services | ${(m.thirdPartyServices || []).join(', ') || 'TBD'} |\n`;
  md += `| Usability Panel Size | ${m.usabilityPanelSize || 'TBD'} |\n\n`;
  md += `> Any field showing "TBD" is an **open item requiring stakeholder input** before this document is circulated for formal sign-off.\n\n---\n\n`;

  md += `## 1. Objectives\n\n`;
  md += `**Primary Test Objective:** ${o.primaryObjective || ''}\n\n`;
  md += `**Quality Goals:**\n`;
  Object.values(o.qualityGoals || {}).forEach(v => { md += `- ${v}\n`; });
  md += `\n**Success Metrics for Sign-Off:**\n`;
  (o.successMetrics || []).forEach(m2 => { md += `- [ ] ${m2}\n`; });

  md += `\n---\n\n## 2. Items / Scope\n\n`;
  md += `**In-Scope Workflows:**\n`;
  (sc.inScopeWorkflows || []).forEach(w => { md += `- ${w}\n`; });
  md += `\n**In-Scope Modules:**\n`;
  (sc.inScopeModules || []).forEach(mod => { md += `- ${mod}\n`; });
  md += `\n**Out of Scope:**\n`;
  (sc.outOfScope || []).forEach(o2 => { md += `- ${o2}\n`; });
  md += `\n**Test Levels in Scope:**\n\n`;
  md += `| Test Level | Owner | Coverage Target | Tooling |\n|---|---|---|---|\n`;
  (sc.testLevels || []).forEach(tl => {
    md += `| ${tl.level} | ${tl.owner} | ${tl.coverageTarget} | ${tl.tooling} |\n`;
  });

  md += `\n---\n\n## 3. Risks\n\n`;
  md += `| Risk | Likelihood | Impact | Mitigation | Owner |\n|---|---|---|---|---|\n`;
  (s.risks || []).forEach(r => {
    md += `| ${r.risk} | ${r.likelihood} | ${r.impact} | ${r.mitigation} | ${r.owner} |\n`;
  });

  md += `\n---\n\n## 4. Criteria (Entry / Exit)\n\n`;
  md += `| Phase | Entry Criteria | Exit Criteria |\n|---|---|---|\n`;
  (cr.phases || []).forEach(p => {
    md += `| ${p.phase} | ${p.entryCriteria} | ${p.exitCriteria} |\n`;
  });
  md += `\n**Suspension Criteria:** ${cr.suspensionCriteria || 'TBD'}\n\n`;
  md += `**Resumption Criteria:** ${cr.resumptionCriteria || 'TBD'}\n`;

  md += `\n---\n\n## 5. Environment\n\n`;
  md += `| Environment | Purpose | Data Strategy | Notes |\n|---|---|---|---|\n`;
  (env.environments || []).forEach(e => {
    md += `| ${e.name} | ${e.purpose} | ${e.dataStrategy} | ${e.notes} |\n`;
  });
  md += `\n**Third-Party / Sandbox Dependencies:** ${env.thirdPartyDependencies || 'TBD'}\n`;

  md += `\n---\n\n## 6. People\n\n`;
  md += `| Role | Name/TBD | Responsibility |\n|---|---|---|\n`;
  (ppl.roles || []).forEach(r => {
    md += `| ${r.role} | ${r.name || 'TBD'} | ${r.responsibility} |\n`;
  });
  md += `\n**Team Size & Duration:** ${ppl.teamSize || 'TBD'}\n\n`;
  md += `**Escalation Path:** ${ppl.escalationPath || 'TBD'}\n`;

  md += `\n---\n\n## 7. Tools & Techniques\n\n`;
  md += `**Test Design Techniques:**\n`;
  (tt.testDesignTechniques || []).forEach(t => { md += `- ${t}\n`; });
  md += `\n**Automation Stack:** ${tt.automationStack || 'TBD'}\n\n`;
  md += `**Performance Tooling:** ${tt.performanceTooling || 'TBD'}\n\n`;
  md += `**Security Tooling / Standards:** ${tt.securityTooling || 'TBD'}\n\n`;
  md += `**Compatibility Matrix Tooling:** ${tt.compatibilityTooling || 'TBD'}\n\n`;
  md += `**Test Management / Defect Tracking:** ${tt.testManagement || 'TBD'}\n`;

  md += `\n---\n\n## 8. Schedule\n\n`;
  md += `| Phase | Timeframe | Activities |\n|---|---|---|\n`;
  (sch.phases || []).forEach(p => {
    md += `| ${p.phase} | ${p.timeframe} | ${p.activities} |\n`;
  });
  md += `\n**Sprint Cadence:** ${sch.sprintCadence || 'TBD'}\n\n`;
  md += `**Project Timeline:** ${sch.projectTimeline || 'TBD'}\n`;

  md += `\n---\n\n## 9. Deliverables\n\n`;
  (s.deliverables || []).forEach(d => { md += `- ${d}\n`; });

  md += `\n---\n\n*Any bracketed or TBD field above must be resolved before this document is circulated for formal sign-off.*\n\n`;
  md += `*Generated by B.L.A.S.T. Framework — Enterprise Test Strategy Generator*  \n`;
  md += `*${new Date().toLocaleString()} — AI-powered by GROQ Llama 3.3 70B*\n`;
  return md;
}
