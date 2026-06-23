import React, { useState, useRef, useCallback } from 'react';
import { useConfig } from '../../context/ConfigContext';
import APIContractService from '../../services/apiContractService';
import '../styles/APIContractForge.css';

const BLAST_PHASES = [
  { key: 'B', label: 'Blueprint',  desc: 'Parsing OpenAPI spec & extracting endpoints…' },
  { key: 'L', label: 'Link',       desc: 'Mapping coverage to endpoints…' },
  { key: 'A', label: 'Architect',  desc: 'AI generating test scenarios…' },
  { key: 'S', label: 'Stylize',    desc: 'Building Postman collection…' },
  { key: 'T', label: 'Trigger',    desc: 'Finalizing Newman & k6 scripts…' },
];

const AUTH_TYPES = ['Bearer Token', 'API Key', 'Basic Auth', 'OAuth2', 'None'];

const RESULT_TABS = [
  { id: 'positive',         label: '✅ Positive',  suiteKey: 'positive'         },
  { id: 'negative',         label: '❌ Negative',  suiteKey: 'negative'         },
  { id: 'auth',             label: '🔐 Auth',      suiteKey: 'auth'             },
  { id: 'contractViolation',label: '📋 Contract',  suiteKey: 'contractViolation'},
  { id: 'owasp',            label: '🛡️ OWASP',     suiteKey: 'owasp'            },
  { id: 'postman',          label: '📦 Postman',   suiteKey: null               },
  { id: 'newman',           label: '⚡ Newman',    suiteKey: null               },
  { id: 'k6',               label: '📈 k6',        suiteKey: null               },
];

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#f59e0b',
  Low:      '#22c55e',
};

export default function APIContractForgePanel() {
  const { config } = useConfig();

  const [specFile,    setSpecFile]    = useState(null);
  const [specText,    setSpecText]    = useState('');
  const [baseUrl,     setBaseUrl]     = useState('');
  const [authType,    setAuthType]    = useState('Bearer Token');
  const [isDragOver,  setIsDragOver]  = useState(false);
  const fileInputRef = useRef(null);

  const [loading,    setLoading]    = useState(false);
  const [blastPhase, setBlastPhase] = useState(0);
  const [error,      setError]      = useState('');

  const [result,    setResult]    = useState(null);
  const [activeTab, setActiveTab] = useState('positive');

  /* ── File handling ───────────────────────────────── */
  const loadFile = (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.json')) {
      setError('Please upload a .json OpenAPI/Swagger spec file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSpecFile(file);
      setSpecText(e.target.result);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const clearSpec = (e) => {
    e.stopPropagation();
    setSpecFile(null);
    setSpecText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Generate ────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    const trimmed = specText.trim();
    if (!trimmed) {
      setError('Please upload or paste an OpenAPI/Swagger spec.');
      return;
    }
    let spec;
    try {
      spec = JSON.parse(trimmed);
    } catch (e) {
      setError('Invalid JSON — please check your spec and try again.');
      return;
    }
    if (!config.groq?.apiKey) {
      setError('GROQ API key not configured. Go to Settings to add your key.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);
    setBlastPhase(0);

    const phaseTimer = setInterval(() => {
      setBlastPhase(prev => (prev < BLAST_PHASES.length - 1 ? prev + 1 : prev));
    }, 3800);

    try {
      const service = new APIContractService(config.groq.apiKey);
      const res = await service.generateTestSuite({
        spec,
        baseUrl: baseUrl.trim() || undefined,
        authType,
      });

      clearInterval(phaseTimer);

      if (!res.success) {
        setError(res.error || 'Generation failed. Please try again.');
        setLoading(false);
        return;
      }

      setResult(res);
      setActiveTab('positive');
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      clearInterval(phaseTimer);
      setLoading(false);
      setBlastPhase(0);
    }
  }, [specText, baseUrl, authType, config]);

  /* ── Downloads ───────────────────────────────────── */
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const safeTitle = result
    ? result.specInfo.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    : 'api';

  /* ── Renderers ───────────────────────────────────── */
  const renderTestCard = (tc, i) => (
    <div key={i} className="acf-test-card">
      <div className="acf-test-card-header">
        <span className="acf-tc-id">{tc.id || `TC-${String(i + 1).padStart(3, '0')}`}</span>
        <span className="acf-tc-endpoint">{tc.endpoint}</span>
        <span
          className="acf-priority-chip"
          style={{ background: PRIORITY_COLORS[tc.priority] || '#64748b' }}
        >
          {tc.priority || 'Medium'}
        </span>
        {tc.owaspCategory && tc.owaspCategory !== 'null' && (
          <span className="acf-owasp-chip">{tc.owaspCategory.split('-')[0]}</span>
        )}
      </div>
      <div className="acf-tc-name">{tc.name}</div>
      <div className="acf-tc-desc">{tc.description}</div>

      {tc.expectedStatus && (
        <div className="acf-tc-meta-row">
          <span className="acf-tc-meta-item">
            Expected: <strong>{tc.expectedStatus}</strong>
          </span>
          {tc.expectedSchema && (
            <span className="acf-tc-meta-item acf-schema-note">{tc.expectedSchema}</span>
          )}
        </div>
      )}

      {tc.assertions && tc.assertions.length > 0 && (
        <div className="acf-assertions-block">
          <div className="acf-assertions-label">Assertions</div>
          <ul className="acf-assertions-list">
            {tc.assertions.map((a, j) => <li key={j}>{a}</li>)}
          </ul>
        </div>
      )}

      {tc.notes && <div className="acf-tc-notes">{tc.notes}</div>}
    </div>
  );

  const renderTestTab = (tests) => {
    if (!tests || tests.length === 0) {
      return <div className="acf-empty-state">No test cases generated for this category.</div>;
    }
    return (
      <div className="acf-test-list">
        {tests.map((tc, i) => renderTestCard(tc, i))}
      </div>
    );
  };

  const renderCodePanel = (code, filename, onDownload) => (
    <div className="acf-code-panel">
      <div className="acf-code-toolbar">
        <span className="acf-code-filename">
          <span className="acf-code-dot" />
          {filename}
        </span>
        <button className="acf-download-btn" onClick={onDownload}>
          ⬇ Download {filename}
        </button>
      </div>
      <pre className="acf-code-block"><code>{code}</code></pre>
    </div>
  );

  const totalTests = result
    ? result.testSuite.positive.length +
      result.testSuite.negative.length +
      result.testSuite.auth.length +
      result.testSuite.contractViolation.length +
      result.testSuite.owasp.length
    : 0;

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="acf-panel">

      {/* Header */}
      <div className="acf-header">
        <div className="acf-header-left">
          <div className="acf-header-icon">🔗</div>
          <div>
            <h1 className="acf-title">API Contract Forge</h1>
            <p className="acf-subtitle">
              Upload an OpenAPI/Swagger spec → AI generates a complete test suite with Postman, Newman & k6
            </p>
          </div>
        </div>
        <div className="acf-header-badges">
          <span className="acf-badge acf-badge-hot">Biggest Gap</span>
          <span className="acf-badge acf-badge-owasp">OWASP API Top 10</span>
        </div>
      </div>

      {/* Input section */}
      <div className="acf-input-section">

        {/* Drop zone */}
        <div
          className={`acf-dropzone${isDragOver ? ' drag-over' : ''}${specFile ? ' has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !specFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && loadFile(e.target.files[0])}
          />

          {specFile ? (
            <div className="acf-file-loaded">
              <span className="acf-file-icon">📄</span>
              <div className="acf-file-details">
                <span className="acf-file-name">{specFile.name}</span>
                <span className="acf-file-size">{(specFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button className="acf-file-remove" onClick={clearSpec}>✕</button>
            </div>
          ) : (
            <div className="acf-dropzone-content">
              <div className="acf-drop-icon">📂</div>
              <div className="acf-drop-title">Drop your OpenAPI / Swagger spec here</div>
              <div className="acf-drop-sub">Supports OpenAPI 3.x and Swagger 2.x · .json files only</div>
              <div className="acf-drop-btn">Browse File</div>
            </div>
          )}
        </div>

        <div className="acf-or-divider"><span>or paste JSON below</span></div>

        <textarea
          className="acf-spec-textarea"
          placeholder='{ "openapi": "3.0.0", "info": { "title": "Pet Store", "version": "1.0.0" }, "paths": { "/pets": { "get": { ... } } } }'
          value={specText}
          onChange={(e) => {
            setSpecText(e.target.value);
            if (specFile) { setSpecFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
          }}
          rows={7}
          spellCheck={false}
        />

        {/* Options row */}
        <div className="acf-options-row">
          <div className="acf-opt-group acf-opt-grow">
            <label className="acf-opt-label">Base URL Override</label>
            <input
              className="acf-opt-input"
              type="url"
              placeholder="https://api.yourapp.com (auto-detected from spec if blank)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          <div className="acf-opt-group acf-opt-narrow">
            <label className="acf-opt-label">Auth Type</label>
            <select
              className="acf-opt-select"
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
            >
              {AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <button
            className="acf-generate-btn"
            onClick={handleGenerate}
            disabled={loading || !specText.trim()}
          >
            {loading ? '⏳ Forging…' : '⚡ Forge Test Suite'}
          </button>
        </div>

        {error && (
          <div className="acf-error">
            <span className="acf-error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      {/* B.L.A.S.T. tracker */}
      {loading && (
        <div className="acf-blast-tracker">
          <div className="acf-blast-header">
            <span className="acf-blast-spinner" />
            B.L.A.S.T. Contract Analysis in Progress
          </div>
          <div className="acf-blast-phases">
            {BLAST_PHASES.map((phase, i) => (
              <div
                key={phase.key}
                className={`acf-blast-phase${i < blastPhase ? ' done' : ''}${i === blastPhase ? ' active' : ''}`}
              >
                <div className="acf-blast-letter">{phase.key}</div>
                <div className="acf-blast-phase-label">{phase.label}</div>
                {i === blastPhase && (
                  <div className="acf-blast-phase-desc">{phase.desc}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="acf-results">

          {/* Results header bar */}
          <div className="acf-results-header">
            <div className="acf-results-title">
              <span className="acf-results-check">✅</span>
              Test Suite Generated
            </div>
            <div className="acf-results-chips">
              <span className="acf-chip">{totalTests} test cases</span>
              <span className="acf-chip">{result.specInfo.endpoints.length} endpoints</span>
              <span className="acf-chip">via {result.modelUsed}</span>
            </div>
          </div>

          {/* Spec summary strip */}
          <div className="acf-spec-strip">
            <span className="acf-spec-api-title">{result.specInfo.title}</span>
            <span className="acf-spec-version">v{result.specInfo.version}</span>
            <span className="acf-spec-url">{result.specInfo.baseUrl}</span>
          </div>

          {/* Tab bar */}
          <div className="acf-tab-bar">
            {RESULT_TABS.map(tab => {
              const count = tab.suiteKey ? result.testSuite[tab.suiteKey]?.length : null;
              return (
                <button
                  key={tab.id}
                  className={`acf-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {count !== null && <span className="acf-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="acf-tab-content">
            {activeTab === 'positive'          && renderTestTab(result.testSuite.positive)}
            {activeTab === 'negative'          && renderTestTab(result.testSuite.negative)}
            {activeTab === 'auth'              && renderTestTab(result.testSuite.auth)}
            {activeTab === 'contractViolation' && renderTestTab(result.testSuite.contractViolation)}
            {activeTab === 'owasp'             && renderTestTab(result.testSuite.owasp)}
            {activeTab === 'postman' && renderCodePanel(
              JSON.stringify(result.postmanCollection, null, 2),
              'postman-collection.json',
              () => downloadJSON(result.postmanCollection, `${safeTitle}-postman.json`)
            )}
            {activeTab === 'newman' && renderCodePanel(
              result.newmanScript,
              'run-newman.sh',
              () => downloadText(result.newmanScript, 'run-newman.sh')
            )}
            {activeTab === 'k6' && renderCodePanel(
              result.k6Script,
              'k6-load-test.js',
              () => downloadText(result.k6Script, 'k6-load-test.js')
            )}
          </div>

          {/* Export action row */}
          <div className="acf-export-row">
            <div className="acf-export-label">Export artifacts:</div>
            <button
              className="acf-export-btn"
              onClick={() => downloadJSON(result.postmanCollection, `${safeTitle}-postman.json`)}
            >
              📦 Postman Collection
            </button>
            <button
              className="acf-export-btn"
              onClick={() => downloadText(result.newmanScript, 'run-newman.sh')}
            >
              ⚡ Newman Script
            </button>
            <button
              className="acf-export-btn"
              onClick={() => downloadText(result.k6Script, 'k6-load-test.js')}
            >
              📈 k6 Load Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
