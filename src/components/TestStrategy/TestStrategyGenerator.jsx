/**
 * TestStrategyGenerator.jsx
 * B.L.A.S.T. Framework — RICE-POT Test Strategy Generator
 * RICE-POT = Risks · Items · Criteria · Environment · People · Objectives · Tools
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useConfig } from '../../context/ConfigContext';
import TestStrategyService from '../../services/testStrategyService';
import { exportStrategyToHTML, exportStrategyToMarkdown } from '../../services/testMetricsExporter';
import { extractFileContent, describeImageViaVision } from '../../utils/fileExtractor';
import LoadingSpinner from '../LoadingSpinner';
import '../styles/TestStrategy.css';

const PRODUCT_TYPES = [
  'Web Application (SaaS)',
  'Mobile Application (iOS/Android)',
  'Desktop Software',
  'Enterprise / Workflow Software',
  'REST API / Backend Service',
  'E-Commerce Platform',
  'FinTech / Banking Application',
  'Healthcare / MedTech Platform',
  'IoT / Hardware Device',
  'Multi-platform Product',
];

const RICEPOT = [
  { letter: 'R', label: 'Risks',       icon: '⚠️', key: 'risks',       accent: '#ef4444' },
  { letter: 'I', label: 'Items',       icon: '📋', key: 'items',       accent: '#f59e0b' },
  { letter: 'C', label: 'Criteria',    icon: '✅', key: 'criteria',    accent: '#22c55e' },
  { letter: 'E', label: 'Environment', icon: '🖥️', key: 'environment', accent: '#06b6d4' },
  { letter: 'P', label: 'People',      icon: '👥', key: 'people',      accent: '#8b5cf6' },
  { letter: 'O', label: 'Objectives',  icon: '🎯', key: 'objectives',  accent: '#4f46e5' },
  { letter: 'T', label: 'Tools',       icon: '🔧', key: 'tools',       accent: '#0f172a' },
];

const BLAST_STAGES = [
  { letter: 'B', name: 'Blueprint',  desc: 'Parsing requirements & defining RICE-POT scope' },
  { letter: 'L', name: 'Link',       desc: 'Connecting to AI engine & loading strategy context' },
  { letter: 'A', name: 'Architect',  desc: 'Building 7-dimension quality model' },
  { letter: 'S', name: 'Stylize',    desc: 'Formatting enterprise strategy document' },
  { letter: 'T', name: 'Trigger',    desc: 'Finalising & packaging for delivery' },
];

/* ── Small display helpers ─────────────────────────────── */
function ScoreBadge({ value }) {
  const v = (value || '').toLowerCase();
  const cls = v === 'high' ? 'score-high' : v === 'medium' ? 'score-med' : 'score-low';
  return <span className={`rp-score ${cls}`}>{value}</span>;
}
function PBadge({ p }) {
  const cls = p === 'P0' ? 'rp-p0' : p === 'P1' ? 'rp-p1' : p === 'P2' ? 'rp-p2' : 'rp-p3';
  return <span className={`rp-pri ${cls}`}>{p}</span>;
}

/* ── Section renderers ────────────────────────────────── */
function RisksTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-table-scroll">
        <table className="rp-table">
          <thead>
            <tr><th>ID</th><th>Category</th><th>Risk</th><th>Prob</th><th>Impact</th><th>Score</th><th>Mitigation</th><th>Contingency</th><th>Owner</th></tr>
          </thead>
          <tbody>
            {(data.register || []).map(r => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td><span className="rp-tag">{r.category}</span></td>
                <td>{r.risk}</td>
                <td><ScoreBadge value={r.probability} /></td>
                <td><ScoreBadge value={r.impact} /></td>
                <td><ScoreBadge value={r.riskScore} /></td>
                <td>{r.mitigation}</td>
                <td>{r.contingency}</td>
                <td className="rp-owner">{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemsTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <h4 className="rp-subhead">In Scope</h4>
      <div className="rp-table-scroll">
        <table className="rp-table">
          <thead><tr><th>Item</th><th>Priority</th><th>Testing Type</th><th>Risk Level</th><th>Rationale</th></tr></thead>
          <tbody>
            {(data.inScope || []).map((i, idx) => (
              <tr key={idx}>
                <td>{i.item}</td>
                <td><PBadge p={i.priority} /></td>
                <td>{i.testingType}</td>
                <td><ScoreBadge value={i.riskLevel} /></td>
                <td>{i.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="rp-subhead" style={{ marginTop: 20 }}>Out of Scope</h4>
      <div className="rp-chips">
        {(data.outOfScope || []).map((o, i) => <span key={i} className="rp-chip-out">{o}</span>)}
      </div>
      {(data.assumptions || []).length > 0 && (
        <>
          <h4 className="rp-subhead" style={{ marginTop: 20 }}>Assumptions</h4>
          <ul className="rp-ul">{data.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </>
      )}
    </div>
  );
}

function CriteriaTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-phases">
        {(data.phases || []).map((p, i) => (
          <div key={i} className="rp-phase-card">
            <div className="rp-phase-hdr">
              <span className="rp-phase-name">{p.phase}</span>
              <span className="rp-phase-dur">{p.duration}</span>
            </div>
            <div className="rp-phase-cols">
              <div>
                <div className="rp-crit-label entry-lbl">Entry Criteria</div>
                <ul className="rp-crit-list">{(p.entryCriteria || []).map((c, j) => <li key={j}>{c}</li>)}</ul>
              </div>
              <div>
                <div className="rp-crit-label exit-lbl">Exit Criteria</div>
                <ul className="rp-crit-list">{(p.exitCriteria || []).map((c, j) => <li key={j}>{c}</li>)}</ul>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(data.releaseExitCriteria || []).length > 0 && (
        <div className="rp-release-box">
          <div className="rp-release-title">Release Go/No-Go Exit Criteria</div>
          <ul className="rp-release-list">
            {data.releaseExitCriteria.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnvironmentTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-env-grid">
        {(data.environments || []).map((e, i) => (
          <div key={i} className="rp-env-card">
            <div className="rp-env-name">{e.name}</div>
            <span className="rp-env-type">{e.type}</span>
            <div className="rp-env-row"><strong>Purpose:</strong> {e.purpose}</div>
            <div className="rp-env-row"><strong>Infrastructure:</strong> {e.infrastructure}</div>
            <div className="rp-env-row"><strong>Data Strategy:</strong> {e.dataStrategy}</div>
            <div className="rp-env-row"><strong>Owner:</strong> {e.owner}</div>
            {e.healthCheck && <div className="rp-env-row"><strong>Health Check:</strong> {e.healthCheck}</div>}
          </div>
        ))}
      </div>
      {(data.requirements || []).length > 0 && (
        <>
          <h4 className="rp-subhead" style={{ marginTop: 20 }}>Environment Requirements</h4>
          <ul className="rp-ul">{data.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </>
      )}
    </div>
  );
}

function PeopleTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-roles-grid">
        {(data.roles || []).map((r, i) => (
          <div key={i} className="rp-role-card">
            <div className="rp-role-hdr">
              <span className="rp-role-name">{r.role}</span>
              <span className="rp-role-alloc">{r.allocation}</span>
            </div>
            {r.reportingLine && <div className="rp-reports">Reports to: {r.reportingLine}</div>}
            <div className="rp-role-section">Responsibilities</div>
            <ul className="rp-ul">{(r.responsibilities || []).map((x, j) => <li key={j}>{x}</li>)}</ul>
            {(r.skills || []).length > 0 && (
              <div className="rp-skills">
                {r.skills.map((s, j) => <span key={j} className="rp-skill">{s}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
      {(data.raci || []).length > 0 && (
        <>
          <h4 className="rp-subhead" style={{ marginTop: 24 }}>RACI Chart</h4>
          <div className="rp-table-scroll">
            <table className="rp-table">
              <thead>
                <tr><th>Activity</th><th className="raci-r">Responsible</th><th className="raci-a">Accountable</th><th>Consulted</th><th>Informed</th></tr>
              </thead>
              <tbody>
                {data.raci.map((r, i) => (
                  <tr key={i}>
                    <td>{r.activity}</td>
                    <td className="raci-r-cell">{r.responsible}</td>
                    <td className="raci-a-cell">{r.accountable}</td>
                    <td>{r.consulted}</td>
                    <td>{r.informed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ObjectivesTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.qualityVision && <div className="rp-vision">{data.qualityVision}</div>}
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-table-scroll">
        <table className="rp-table">
          <thead><tr><th>Objective</th><th>KPI</th><th>Target</th><th>Measurement</th><th>Frequency</th></tr></thead>
          <tbody>
            {(data.objectives || []).map((o, i) => (
              <tr key={i}>
                <td><strong>{o.objective}</strong></td>
                <td>{o.kpi}</td>
                <td className="rp-target">{o.target}</td>
                <td>{o.measurement}</td>
                <td>{o.reportingFrequency || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data.reportingCadence || []).length > 0 && (
        <>
          <h4 className="rp-subhead" style={{ marginTop: 24 }}>Reporting Cadence</h4>
          <div className="rp-reports-grid">
            {data.reportingCadence.map((r, i) => (
              <div key={i} className="rp-report-card">
                <div className="rp-report-name">{r.report}</div>
                <div className="rp-report-row"><strong>Audience:</strong> {r.audience}</div>
                <div className="rp-report-row"><strong>Frequency:</strong> {r.frequency}</div>
                <div className="rp-report-row"><strong>Format:</strong> {r.format}</div>
                {r.owner && <div className="rp-report-row"><strong>Owner:</strong> {r.owner}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ToolsTab({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.overview && <p className="rp-overview">{data.overview}</p>}
      <div className="rp-tools-grid">
        {(data.categories || []).map((t, i) => (
          <div key={i} className="rp-tool-card">
            <div className="rp-tool-cat">{t.category}</div>
            <div className="rp-tool-row"><span className="rp-tool-lbl">Primary</span><strong>{t.primary}</strong></div>
            {t.alternative && <div className="rp-tool-row"><span className="rp-tool-lbl">Alternative</span>{t.alternative}</div>}
            {t.licenceType && <div className="rp-tool-row"><span className="rp-tool-lbl">Licence</span>{t.licenceType}</div>}
            <div className="rp-tool-rationale">{t.rationale}</div>
            {(t.setupRequired || []).length > 0 && (
              <div className="rp-tool-setup">
                <span className="rp-tool-lbl">Setup</span>
                <ul>{t.setupRequired.map((s, j) => <li key={j}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */
export default function TestStrategyGeneratorPanel() {
  const { config } = useConfig();

  const [inputMode, setInputMode] = useState('prd');
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [productVersion, setProductVersion] = useState('1.0');
  const [requirements, setRequirements] = useState('');
  const [issueKey, setIssueKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [strategy, setStrategy] = useState(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('risks');
  const [attachedDoc, setAttachedDoc] = useState(null);
  const [extractingDoc, setExtractingDoc] = useState(false);
  const docRef = useRef(null);

  const isGroqConfigured = !!config?.groq?.apiKey;

  const handleDocFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setExtractingDoc(true);
    try {
      const result = await extractFileContent(file);
      setAttachedDoc({ name: file.name, ...result });
    } catch (err) {
      setError(`Failed to read file: ${err.message}`);
    } finally {
      setExtractingDoc(false);
    }
  };

  const exportToExcel = () => {
    if (!strategy) return;
    const wb = XLSX.utils.book_new();
    const pName = strategy.productName || 'Strategy';
    const fname = `TestStrategy_${pName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Overview
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [`RICE-POT Test Strategy — ${pName}`], [],
      ['Product Name', pName],
      ['Product Type', strategy.productType || ''],
      ['Version', strategy.metadata?.version || strategy.version || '1.0'],
      ['Status', strategy.metadata?.status || 'Draft'],
      ['Generated At', new Date(strategy.generatedAt).toLocaleString()], [],
      ['Executive Summary', strategy.executiveSummary || ''],
    ]), 'Overview');

    // Risks
    const risks = strategy.risks?.register || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['ID', 'Category', 'Risk', 'Probability', 'Impact', 'Risk Score', 'Mitigation', 'Contingency', 'Owner'],
      ...risks.map(r => [r.id, r.category || '', r.risk, r.probability, r.impact, r.riskScore, r.mitigation, r.contingency || '', r.owner]),
    ]), 'Risks');

    // Scope
    const inScope  = strategy.items?.inScope  || [];
    const outScope = strategy.items?.outOfScope || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['IN SCOPE'], ['Item', 'Priority', 'Testing Type', 'Risk Level', 'Rationale'],
      ...inScope.map(i => [i.item, i.priority, i.testingType, i.riskLevel, i.rationale]),
      [], ['OUT OF SCOPE'], ['Item'],
      ...outScope.map(i => [typeof i === 'string' ? i : i.item]),
    ]), 'Scope');

    // Criteria / Phases
    const phases = strategy.criteria?.phases || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Phase', 'Entry Criteria', 'Exit Criteria'],
      ...phases.map(p => [p.phase, (p.entry || []).join('\n'), (p.exit || []).join('\n')]),
    ]), 'Criteria');

    // People
    const team = strategy.people?.team || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Role', 'Responsibilities', 'Allocation', 'Skills'],
      ...team.map(m => [m.role, (m.responsibilities || []).join('\n'), m.allocation || '', (m.skills || []).join(', ')]),
    ]), 'People');

    // Tools
    const tools = strategy.tools?.categories || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Category', 'Tool', 'Purpose', 'License'],
      ...tools.flatMap(cat => (cat.tools || []).map(t => [cat.category, t.name || t, t.purpose || '', t.license || ''])),
    ]), 'Tools');

    XLSX.writeFile(wb, fname);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setStrategy(null);
    setLoading(true);
    setStageIdx(0);

    const timer = setInterval(() => setStageIdx(i => i + 1 < BLAST_STAGES.length ? i + 1 : i), 2000);

    try {
      if (!config?.groq?.apiKey) throw new Error('GROQ API key not configured. Go to Settings first.');

      const service = new TestStrategyService(config.groq.apiKey, config.groq.model);
      let docContext = '';
      if (attachedDoc) {
        if (attachedDoc.category === 'image') {
          const desc = await describeImageViaVision(attachedDoc.base64, attachedDoc.mimeType, config.groq.apiKey);
          docContext = `\n\n--- ATTACHED IMAGE DESCRIPTION: ${attachedDoc.name} ---\n${desc}`;
        } else {
          docContext = `\n\n--- ATTACHED DOCUMENT: ${attachedDoc.name} ---\n${attachedDoc.text}`;
        }
      }
      const fullReqs = requirements.trim() + docContext;
      const input = inputMode === 'issue'
        ? { productName: issueKey.trim().toUpperCase() || 'Tracker Issue', requirements: `Tracker Issue: ${issueKey.trim().toUpperCase()}`, productType, version: productVersion }
        : { productName: productName.trim(), requirements: fullReqs, productType, version: productVersion.trim() || '1.0' };

      if (inputMode === 'prd') {
        if (!productName.trim()) throw new Error('Enter a product or feature name.');
        if (!requirements.trim()) throw new Error('Paste your requirements or PRD description.');
      } else {
        if (!issueKey.trim()) throw new Error('Enter an issue / tracker key (e.g. PROJ-123, TW-456, LINEAR-789).');
      }

      const result = await service.generateStrategy(input);
      if (!result.success) throw new Error(result.error);

      setStrategy(result.strategy);
      setActiveSection('risks');
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const renderSection = () => {
    if (!strategy) return null;
    const map = {
      risks:       <RisksTab data={strategy.risks} />,
      items:       <ItemsTab data={strategy.items} />,
      criteria:    <CriteriaTab data={strategy.criteria} />,
      environment: <EnvironmentTab data={strategy.environment} />,
      people:      <PeopleTab data={strategy.people} />,
      objectives:  <ObjectivesTab data={strategy.objectives} />,
      tools:       <ToolsTab data={strategy.tools} />,
    };
    return map[activeSection] || null;
  };

  return (
    <div className="strategy-panel">

      {/* Hero */}
      <div className="strategy-hero-banner">
        <div className="hero-content">
          <div className="hero-badge">AI Quality Intelligence</div>
          <h2 className="hero-title">Strategic Test Blueprint</h2>
          <p className="hero-subtitle">
            Multi-dimensional test strategies covering risks, criteria, environment, people, objectives and tools.
            From PRD to a release-ready strategy document — in seconds.
          </p>
          <div className="hero-stats">
            <div className="hero-stat"><span className="stat-num">7</span><span className="stat-label">Strategy Dimensions</span></div>
            <div className="hero-stat"><span className="stat-num">7+</span><span className="stat-label">Test Phases</span></div>
            <div className="hero-stat"><span className="stat-num">RACI</span><span className="stat-label">Accountability Chart</span></div>
            <div className="hero-stat"><span className="stat-num">2</span><span className="stat-label">Export Formats</span></div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="form-card">
        <div className="form-card-header">
          <h3>Generate Test Strategy from PRD / Requirements</h3>
          <p>Paste your Product Requirements Document, user stories, or feature description below</p>
        </div>

        {/* Mode toggle */}
        <div className="rp-mode-row">
          <button type="button" className={`rp-mode-btn ${inputMode === 'prd' ? 'active' : ''}`} onClick={() => setInputMode('prd')}>
            <span>📝</span><div><strong>PRD / Requirements</strong><small>Paste requirements text</small></div>
          </button>
          <button type="button" className={`rp-mode-btn ${inputMode === 'issue' ? 'active' : ''}`} onClick={() => setInputMode('issue')}>
            <span>🔗</span><div><strong>Issue / Tracker Key</strong><small>Jira · YouTrack · Linear · GitHub · any tracker</small></div>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="generation-form">
          <div className="form-row">
            <div className="form-group">
              <label>Product / Application Type</label>
              <select value={productType} onChange={e => setProductType(e.target.value)} className="form-select">
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {inputMode === 'prd' ? (
            <>
              <div className="form-row two-col">
                <div className="form-group">
                  <label>Product / Feature Name <span className="required">*</span></label>
                  <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                    placeholder="e.g. Payment Gateway Module" required />
                </div>
                <div className="form-group">
                  <label>Version</label>
                  <input type="text" value={productVersion} onChange={e => setProductVersion(e.target.value)}
                    placeholder="e.g. 2.4.0" />
                </div>
              </div>
              <div className="form-group">
                <label>
                  Requirements / PRD <span className="required">*</span>
                  <span className="label-hint">Paste your PRD, user stories, or feature description</span>
                </label>
                <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={9} required
                  placeholder={`Describe your feature or paste your PRD. Example:\n\n"The payment gateway must support Stripe and PayPal. Users pay with credit/debit cards and digital wallets. System must be PCI-DSS Level 1 compliant. Transactions must complete within 3 seconds. Failed payments retry up to 3 times with exponential backoff. No raw card data stored — tokenisation required. Checkout must be WCAG 2.1 AA accessible..."`}
                />
                <small>{requirements.length} characters — more detail produces a more specific RICE-POT strategy</small>
              </div>

              {/* Document attachment */}
              <div className="doc-attach-row">
                <button type="button" className="doc-attach-btn" onClick={() => docRef.current?.click()} disabled={extractingDoc}>
                  📎 Attach Document
                </button>
                <span className="doc-attach-hint">.txt · .md · .pdf · .docx · .png · .jpg</span>
                {extractingDoc && <span className="doc-chip doc-chip-loading">⏳ Extracting…</span>}
                {attachedDoc && !extractingDoc && (
                  <span className="doc-chip">
                    {attachedDoc.category === 'image'
                      ? <img src={attachedDoc.dataUrl} alt="" className="doc-chip-thumb" />
                      : '📄 '}
                    {attachedDoc.name}
                    <button type="button" className="doc-chip-remove" onClick={() => setAttachedDoc(null)}>✕</button>
                  </span>
                )}
              </div>
              <input ref={docRef} type="file" accept=".txt,.md,.json,.xml,.yaml,.yml,.csv,.log,.feature,.pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleDocFile} />
            </>
          ) : (
            <div className="form-row two-col">
              <div className="form-group">
                <label>Issue / Tracker Key <span className="required">*</span></label>
                <input type="text" value={issueKey} onChange={e => setIssueKey(e.target.value.toUpperCase())}
                  placeholder="e.g. PROJ-123, TW-456, LINEAR-789, #42" />
                <small>Works with Jira, YouTrack, Linear, GitHub Issues, Azure DevOps, or any tracker</small>
              </div>
              <div className="form-group">
                <label>Version</label>
                <input type="text" value={productVersion} onChange={e => setProductVersion(e.target.value)}
                  placeholder="e.g. 1.0" />
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <div><strong>Strategy Generation Failed</strong><p>{error}</p></div>
            </div>
          )}

          {!isGroqConfigured && (
            <div className="warning-banner">
              <span>🔑</span>
              <div><strong>GROQ API Key Required</strong><p>Go to Settings to configure your free GROQ API key.</p></div>
            </div>
          )}

          <button type="submit" className="generate-btn strategy-generate-btn" disabled={loading || !isGroqConfigured}>
            {loading
              ? <><span className="btn-spinner" /> Generating RICE-POT Strategy…</>
              : <><span>📐</span> Generate RICE-POT Test Strategy</>
            }
          </button>
        </form>

        {loading && (
          <div className="loading-overlay">
            <div className="blast-phase-tracker">
              {BLAST_STAGES.map((s, i) => (
                <div key={s.letter} className={`blast-phase-step ${i < stageIdx ? 'done' : ''} ${i === stageIdx ? 'active' : ''}`}>
                  <div className="blast-phase-dot">{i < stageIdx ? '✓' : s.letter}</div>
                  <div className="blast-phase-info">
                    <span className="blast-phase-name">{s.name}</span>
                    {i === stageIdx && <span className="blast-phase-desc">{s.desc}…</span>}
                  </div>
                  {i < BLAST_STAGES.length - 1 && <div className={`blast-phase-connector ${i < stageIdx ? 'done' : ''}`} />}
                </div>
              ))}
            </div>
            <LoadingSpinner />
            <p className="loading-hint">Building all 7 RICE-POT dimensions…</p>
          </div>
        )}
      </div>

      {/* Output */}
      {strategy && (
        <div className="strat-display">

          {/* Output header */}
          <div className="strat-display-header">
            <div className="strat-meta-block">
              <h2 className="strat-product-name">RICE-POT Test Strategy — {strategy.productName}</h2>
              <div className="strat-meta-tags">
                <span className="strat-meta-tag">{strategy.productType}</span>
                <span className="strat-meta-tag">v{strategy.metadata?.version || strategy.version || '1.0'}</span>
                <span className="strat-meta-tag strat-status-tag">{strategy.metadata?.status || 'Draft'}</span>
                <span className="strat-meta-tag">{new Date(strategy.generatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="export-bar">
              <span className="export-label">Download:</span>
              <button className="export-btn excel-btn" onClick={exportToExcel}>📊 Excel</button>
              <button className="export-btn md-btn" onClick={() => exportStrategyToHTML(strategy)}>📄 HTML (PDF-ready)</button>
              <button className="export-btn print-btn" onClick={() => exportStrategyToMarkdown(strategy)}>📝 Markdown</button>
            </div>
          </div>

          {/* Executive summary */}
          {strategy.executiveSummary && (
            <div className="rp-exec-summary">
              <span className="rp-exec-label">Executive Summary</span>
              <p>{strategy.executiveSummary}</p>
            </div>
          )}

          {/* RICE-POT tab nav */}
          <div className="rp-tab-nav">
            {RICEPOT.map(s => (
              <button
                key={s.key}
                className={`rp-tab ${activeSection === s.key ? 'active' : ''}`}
                style={activeSection === s.key ? { borderBottomColor: s.accent, color: s.accent } : {}}
                onClick={() => setActiveSection(s.key)}
              >
                <span className="rp-tab-letter" style={{ background: s.accent }}>{s.letter}</span>
                <span className="rp-tab-label">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Section body */}
          <div className="rp-section-body">
            {(() => {
              const s = RICEPOT.find(x => x.key === activeSection);
              return s ? (
                <div className="rp-section-title-row">
                  <span className="rp-section-letter" style={{ background: s.accent }}>{s.letter}</span>
                  <h3>{s.icon} {s.label}</h3>
                </div>
              ) : null;
            })()}
            {renderSection()}
          </div>

          {/* Bottom export */}
          <div className="rp-bottom-export">
            <span className="rp-export-label">Download complete RICE-POT strategy:</span>
            <button className="export-btn excel-btn" onClick={exportToExcel}>📊 Excel</button>
            <button className="export-btn md-btn" onClick={() => exportStrategyToHTML(strategy)}>📄 HTML (PDF-ready)</button>
            <button className="export-btn print-btn" onClick={() => exportStrategyToMarkdown(strategy)}>📝 Markdown</button>
          </div>
        </div>
      )}
    </div>
  );
}
