import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { useHistory } from '../../context/HistoryContext';
import '../History/HistoryPanel.css';
import TestCaseService, { TEST_TYPES } from '../../services/testCaseService';
import { exportTestCases } from '../../utils/testCaseExporter';
import { extractFileContent, describeImageViaVision } from '../../utils/fileExtractor';
import TestCaseTable from './TestCaseTable';
import CreateDefectModal from './CreateDefectModal';
import '../styles/TestCaseGenerator.css';

const INPUT_MODES = { PRD: 'prd', ISSUE: 'issue', SCREENSHOT: 'screenshot' };

const EXPORT_ACTIONS = [
  { tool: 'generic',  format: 'excel',    label: 'Excel (.xlsx)',  icon: '📊', hint: '6 sheets: Test Cases · Field Dictionary · Lookup Lists · JIRA · XRay · YouTrack' },
  { tool: 'jira',     format: 'csv',      label: 'JIRA CSV',       icon: '🔷', hint: 'Native JIRA import' },
  { tool: 'xray',     format: 'csv',      label: 'XRay CSV',       icon: '🧪', hint: 'XRay Test import' },
  { tool: 'zephyr',   format: 'csv',      label: 'Zephyr CSV',     icon: '♦️',  hint: 'Zephyr Scale import' },
  { tool: 'youtrack', format: 'csv',      label: 'YouTrack CSV',   icon: '🔶', hint: 'YouTrack import' },
  { tool: 'generic',  format: 'csv',      label: 'Generic CSV',    icon: '📋', hint: 'All 23 fields' },
  { tool: 'generic',  format: 'json',     label: 'JSON',           icon: '{ }', hint: 'Structured data' },
  { tool: 'generic',  format: 'markdown', label: 'Markdown',       icon: '📝', hint: 'Human readable' },
];

const COUNT_PRESETS = [5, 10, 20, 30, 50];

const BLAST_PHASES = [
  { letter: 'B', name: 'Blueprint',  desc: 'Parsing requirements & defining test scope' },
  { letter: 'L', name: 'Link',       desc: 'Connecting to AI engine & validating context' },
  { letter: 'A', name: 'Architect',  desc: 'Building 3-layer test structure (positive / negative / edge)' },
  { letter: 'S', name: 'Stylize',    desc: 'Formatting to 23-field enterprise template' },
  { letter: 'T', name: 'Trigger',    desc: 'Finalising & packaging test cases for delivery' },
];

/* ── Edit Modal ─────────────────────────────────────────────── */
function EditModal({ tc, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...tc });

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const fields = [
    { key: 'testCaseId',      label: 'Test Case ID',       type: 'text' },
    { key: 'linkedStoryKey',  label: 'Linked Story/Epic',  type: 'text' },
    { key: 'summary',         label: 'Summary',            type: 'text' },
    { key: 'testType',        label: 'Test Type',          type: 'select',
      options: ['Functional','Negative','Boundary','Integration','Security','Performance','Accessibility','Regression','Smoke','UAT','Exploratory'] },
    { key: 'executionType',   label: 'Execution Type',     type: 'select', options: ['Manual','Automated'] },
    { key: 'priority',        label: 'Priority',           type: 'select', options: ['Critical','High','Medium','Low'] },
    { key: 'severity',        label: 'Severity',           type: 'select', options: ['Critical','Major','Minor','Trivial'] },
    { key: 'component',       label: 'Component',          type: 'text' },
    { key: 'labels',          label: 'Labels',             type: 'text' },
    { key: 'preconditions',   label: 'Preconditions',      type: 'textarea' },
    { key: 'testSteps',       label: 'Test Steps',         type: 'textarea' },
    { key: 'testData',        label: 'Test Data',          type: 'textarea' },
    { key: 'expectedResult',  label: 'Expected Result',    type: 'textarea' },
    { key: 'actualResult',    label: 'Actual Result',      type: 'textarea' },
    { key: 'status',          label: 'Status',             type: 'select',
      options: ['Not Executed','In Progress','Pass','Fail','Blocked','Deferred'] },
    { key: 'assignee',        label: 'Assignee',           type: 'text' },
    { key: 'reporter',        label: 'Reporter',           type: 'text' },
    { key: 'sprint',          label: 'Sprint',             type: 'text' },
    { key: 'testEnvironment', label: 'Test Environment',   type: 'text' },
    { key: 'executedDate',    label: 'Executed Date',      type: 'date' },
    { key: 'defectId',        label: 'Defect ID',          type: 'text' },
    { key: 'comments',        label: 'Comments / Notes',   type: 'textarea' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Test Case — <code>{tc.testCaseId}</code></h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {fields.map(({ key, label, type, options }) => (
            <div className="modal-field" key={key}>
              <label>{label}</label>
              {type === 'textarea' ? (
                <textarea
                  value={draft[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  rows={3}
                />
              ) : type === 'select' ? (
                <select value={draft[key] || ''} onChange={e => set(key, e.target.value)}>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  value={draft[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="modal-save-btn" onClick={() => onSave(draft)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function TestCaseGenerator() {
  const { config } = useConfig();
  const { saveItem, pendingRestore, clearPendingRestore } = useHistory();
  const [savedFlash, setSavedFlash] = useState(false);

  /* input state */
  const [inputMode, setInputMode]   = useState(INPUT_MODES.PRD);
  const [productName, setProductName] = useState('');
  const [module, setModule]         = useState('');
  const [requirements, setRequirements] = useState('');
  const [issueKey, setIssueKey]     = useState('');
  const [linkedKey, setLinkedKey]   = useState('');
  const [sprint, setSprint]         = useState('');
  const [environment, setEnvironment] = useState('QA');
  const [assignee, setAssignee] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(new Set(['functional', 'negative', 'boundary']));
  const [count, setCount] = useState(10);

  /* screenshot state */
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotAnalysis, setScreenshotAnalysis] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [analyzingShot, setAnalyzingShot] = useState(false);
  const fileInputRef = useRef(null);
  const docFileRef   = useRef(null);

  const [attachedDoc, setAttachedDoc] = useState(null);
  const [extractingDoc, setExtractingDoc] = useState(false);

  /* generation state */
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState('');
  const [errorMeta, setErrorMeta] = useState(null); // { isRateLimit, retryAfter }
  const [modelUsed, setModelUsed] = useState(null);
  const [testCases, setTestCases] = useState([]);

  /* table state */
  const [selected, setSelected] = useState(new Set());
  const [editingTc, setEditingTc] = useState(null);

  useEffect(() => {
    if (pendingRestore?.type === 'testcases') {
      const d = pendingRestore.data;
      if (d.requirements)  setRequirements(d.requirements);
      if (d.issueKey)      setIssueKey(d.issueKey);
      if (d.productName)   setProductName(d.productName);
      if (d.inputMode)     setInputMode(d.inputMode);
      if (d.testCases)     setTestCases(d.testCases);
      clearPendingRestore();
    }
  }, [pendingRestore, clearPendingRestore]);

  const handleSave = useCallback(() => {
    if (!testCases.length) return;
    const title = productName || issueKey || requirements.slice(0, 60) || 'Test Cases';
    saveItem('testcases', title, { productName, inputMode, requirements, issueKey, testCases });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [testCases, productName, issueKey, inputMode, requirements, saveItem]);
  const [defectTarget, setDefectTarget] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  /* toggle test type */
  const toggleType = (id) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  /* screenshot helpers */
  const loadScreenshotFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setScreenshotFile(file);
    setScreenshotAnalysis('');
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDropZoneClick = () => fileInputRef.current?.click();

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadScreenshotFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadScreenshotFile(file);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview('');
    setScreenshotAnalysis('');
  };

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

  /* generate */
  const handleGenerate = useCallback(async () => {
    if (!config?.groq?.apiKey) {
      setError('GROQ API key not configured. Go to Settings first.');
      return;
    }
    if (inputMode === INPUT_MODES.PRD && !productName.trim()) {
      setError('Enter a Product / Feature name.');
      return;
    }
    if (inputMode === INPUT_MODES.ISSUE && !issueKey.trim()) {
      setError('Enter an issue / tracker key (e.g. PROJ-123, TW-456, LINEAR-789).');
      return;
    }
    if (inputMode === INPUT_MODES.SCREENSHOT && !screenshotFile) {
      setError('Upload a screenshot first.');
      return;
    }

    setError('');
    setErrorMeta(null);
    setModelUsed(null);
    setLoading(true);
    setStageIdx(0);
    setTestCases([]);
    setSelected(new Set());

    const service = new TestCaseService(config.groq.apiKey, config.groq.model);

    /* Screenshot mode: analyze image first, then use extracted requirements */
    let docContext = '';
    if (attachedDoc && inputMode === INPUT_MODES.PRD) {
      if (attachedDoc.category === 'image') {
        const desc = await describeImageViaVision(attachedDoc.base64, attachedDoc.mimeType, config.groq.apiKey);
        docContext = `\n\n--- ATTACHED IMAGE DESCRIPTION: ${attachedDoc.name} ---\n${desc}`;
      } else {
        docContext = `\n\n--- ATTACHED DOCUMENT: ${attachedDoc.name} ---\n${attachedDoc.text}`;
      }
    }
    let derivedRequirements = requirements.trim() + docContext;
    if (inputMode === INPUT_MODES.SCREENSHOT) {
      setAnalyzingShot(true);
      const base64 = screenshotPreview.split(',')[1];
      const mimeType = screenshotFile.type || 'image/png';
      const visionResult = await service.analyzeScreenshot(base64, mimeType);
      setAnalyzingShot(false);
      if (!visionResult.success) {
        setError(visionResult.error || 'Failed to analyze screenshot.');
        setLoading(false);
        return;
      }
      derivedRequirements = visionResult.description;
      setScreenshotAnalysis(visionResult.description);
    }

    const stageTimer = setInterval(() => {
      setStageIdx(i => (i + 1 < BLAST_PHASES.length ? i + 1 : i));
    }, 1800);

    try {
      const result = await service.generateTestCases({
        productName: inputMode === INPUT_MODES.PRD ? productName : (inputMode === INPUT_MODES.SCREENSHOT ? (productName || 'UI Feature') : issueKey),
        module: module || 'Core Functionality',
        requirements: inputMode === INPUT_MODES.ISSUE ? `Tracker Issue: ${issueKey}` : derivedRequirements,
        testTypes: Array.from(selectedTypes),
        count,
        linkedStoryKey: linkedKey,
        sprint,
        assignee,
        environment,
      });

      if (result.success) {
        setTestCases(result.testCases);
        if (result.wasFallback) setModelUsed(result.modelUsed);
      } else {
        setError(result.error || 'Generation failed.');
        if (result.isRateLimit) setErrorMeta({ isRateLimit: true, retryAfter: result.retryAfter });
      }
    } catch (e) {
      setError(`Unexpected error: ${e.message}`);
    } finally {
      clearInterval(stageTimer);
      setLoading(false);
    }
  }, [config, inputMode, productName, module, requirements, issueKey, linkedKey, sprint, assignee, environment, selectedTypes, count, screenshotFile, screenshotPreview, attachedDoc]);

  /* selection helpers */
  const toggleSelect = (id) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(prev => prev.size === testCases.length ? new Set() : new Set(testCases.map(t => t.testCaseId)));

  /* edit helpers */
  const handleSaveEdit = (updated) => {
    setTestCases(prev => prev.map(t => t.testCaseId === updated.testCaseId ? updated : t));
    setEditingTc(null);
  };

  const handleDefectCreated = (testCaseId, defectId, defectUrl) => {
    setTestCases(prev => prev.map(t =>
      t.testCaseId === testCaseId ? { ...t, defectId, defectUrl, status: 'Fail' } : t
    ));
  };

  /* export helpers */
  const handleExport = ({ tool, format }) => {
    const exportSet = selected.size > 0
      ? testCases.filter(t => selected.has(t.testCaseId))
      : testCases;
    exportTestCases({ testCases: exportSet, tool, format, productName: productName || issueKey });
  };

  /* filtered view */
  const visibleTCs = testCases.filter(tc => {
    const matchType = filterType === 'all' || tc.testType.toLowerCase() === filterType;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term
      || tc.summary.toLowerCase().includes(term)
      || tc.testCaseId.toLowerCase().includes(term)
      || tc.component.toLowerCase().includes(term);
    return matchType && matchSearch;
  });

  /* type count summary */
  const typeCounts = testCases.reduce((acc, tc) => {
    acc[tc.testType] = (acc[tc.testType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="tcg-panel">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="tcg-hero">
        <div className="tcg-hero-content">
          <div className="tcg-hero-badge">AI Quality Intelligence</div>
          <h1 className="tcg-hero-title">Precision Scenario Forge</h1>
          <p className="tcg-hero-sub">
            Generate enterprise-grade test scenarios across 11 coverage types.
            Export directly to JIRA, XRay, Zephyr Scale, YouTrack, CSV, JSON or Markdown.
          </p>
          <div className="tcg-hero-stats">
            <div className="tcg-stat"><span className="tcg-stat-num">23</span><span className="tcg-stat-label">Template Fields</span></div>
            <div className="tcg-stat"><span className="tcg-stat-num">11</span><span className="tcg-stat-label">Test Types</span></div>
            <div className="tcg-stat"><span className="tcg-stat-num">8</span><span className="tcg-stat-label">Export Formats</span></div>
            <div className="tcg-stat"><span className="tcg-stat-num">4</span><span className="tcg-stat-label">Tool Integrations</span></div>
          </div>
        </div>
      </div>

      {/* ── Input Form ───────────────────────────────────── */}
      <div className="tcg-form-card">

        {/* Mode toggle */}
        <div className="tcg-mode-row">
          <button
            className={`tcg-mode-btn ${inputMode === INPUT_MODES.PRD ? 'active' : ''}`}
            onClick={() => setInputMode(INPUT_MODES.PRD)}
          >
            <span className="tcg-mode-icon">📄</span>
            <div>
              <strong>PRD / Requirements</strong>
              <small>Paste requirements text</small>
            </div>
          </button>
          <button
            className={`tcg-mode-btn ${inputMode === INPUT_MODES.ISSUE ? 'active' : ''}`}
            onClick={() => setInputMode(INPUT_MODES.ISSUE)}
          >
            <span className="tcg-mode-icon">🔗</span>
            <div>
              <strong>Issue / Tracker Key</strong>
              <small>Jira · YouTrack · Linear · GitHub</small>
            </div>
          </button>
          <button
            className={`tcg-mode-btn ${inputMode === INPUT_MODES.SCREENSHOT ? 'active' : ''}`}
            onClick={() => setInputMode(INPUT_MODES.SCREENSHOT)}
          >
            <span className="tcg-mode-icon">🖼️</span>
            <div>
              <strong>Screenshot / UI</strong>
              <small>AI vision — attach any screen</small>
            </div>
          </button>
        </div>

        {/* Core inputs */}
        <div className="tcg-form">
          <div className="tcg-row two-col">
            <div className="tcg-field">
              <label>Product / Feature Name <span className="req">*</span></label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. User Authentication, Payment Gateway"
              />
            </div>
            <div className="tcg-field">
              <label>Module / Component</label>
              <input
                type="text"
                value={module}
                onChange={e => setModule(e.target.value)}
                placeholder="e.g. Authentication, Checkout, Dashboard"
              />
            </div>
          </div>

          {inputMode === INPUT_MODES.PRD ? (
            <div className="tcg-field">
              <label>
                Requirements / PRD
                <span className="tcg-label-hint">(paste user story, acceptance criteria or feature description)</span>
              </label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="As a user, I want to log in with my email and password so that I can access my account.&#10;&#10;Acceptance Criteria:&#10;- Valid credentials redirect to dashboard&#10;- Invalid credentials show error message&#10;- Account locks after 5 failed attempts"
                rows={7}
              />
              <div className="doc-attach-row">
                <button type="button" className="doc-attach-btn" onClick={() => docFileRef.current?.click()} disabled={extractingDoc}>
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
              <input ref={docFileRef} type="file" accept=".txt,.md,.json,.xml,.yaml,.yml,.csv,.log,.feature,.pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleDocFile} />
            </div>
          ) : inputMode === INPUT_MODES.SCREENSHOT ? (
            <div className="tcg-field">
              <label>
                Screenshot
                <span className="tcg-label-hint">(AI will extract requirements from your UI screenshot)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              {!screenshotPreview ? (
                <div
                  className={`tcg-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onClick={handleDropZoneClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <span className="tcg-drop-icon">🖼️</span>
                  <p className="tcg-drop-title">Drop a screenshot here or click to upload</p>
                  <p className="tcg-drop-hint">PNG · JPG · WEBP · GIF — any UI screenshot works</p>
                </div>
              ) : (
                <div className="tcg-screenshot-preview-box">
                  <div className="tcg-screenshot-img-wrap">
                    <img src={screenshotPreview} alt="Uploaded screenshot" className="tcg-screenshot-img" />
                    <button className="tcg-screenshot-remove" onClick={clearScreenshot} title="Remove screenshot">✕</button>
                  </div>
                  <div className="tcg-screenshot-meta">
                    <span className="tcg-screenshot-name">{screenshotFile?.name}</span>
                    <button className="tcg-screenshot-change" onClick={handleDropZoneClick}>Change image</button>
                  </div>
                  {screenshotAnalysis && (
                    <div className="tcg-analysis-box">
                      <div className="tcg-analysis-header">
                        <span>✅</span>
                        <strong>AI Vision — Extracted Requirements</strong>
                      </div>
                      <p className="tcg-analysis-text">{screenshotAnalysis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="tcg-row two-col">
              <div className="tcg-field">
                <label>Issue / Tracker Key <span className="req">*</span></label>
                <input
                  type="text"
                  value={issueKey}
                  onChange={e => setIssueKey(e.target.value)}
                  placeholder="e.g. PROJ-123, TW-456, LINEAR-789, #42"
                />
                <small>Works with Jira, YouTrack, Linear, GitHub Issues, Azure DevOps, or any tracker</small>
              </div>
              <div className="tcg-field">
                <label>Linked Story / Epic Key</label>
                <input
                  type="text"
                  value={linkedKey}
                  onChange={e => setLinkedKey(e.target.value)}
                  placeholder="e.g. EPIC-001, STORY-55"
                />
              </div>
            </div>
          )}

          <div className="tcg-row three-col">
            <div className="tcg-field">
              <label>Sprint</label>
              <input
                type="text"
                value={sprint}
                onChange={e => setSprint(e.target.value)}
                placeholder="Sprint 1"
              />
            </div>
            <div className="tcg-field">
              <label>Test Environment</label>
              <select value={environment} onChange={e => setEnvironment(e.target.value)}>
                <option>QA</option>
                <option>Staging</option>
                <option>UAT</option>
                <option>Production</option>
                <option>Dev</option>
              </select>
            </div>
            <div className="tcg-field">
              <label>Assignee</label>
              <input
                type="text"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="QA Team"
              />
            </div>
          </div>

          {/* Test types */}
          <div className="tcg-field">
            <label>Test Types to Generate <span className="req">*</span></label>
            <div className="tcg-type-grid">
              {TEST_TYPES.map(({ id, label, icon, color }) => (
                <button
                  key={id}
                  type="button"
                  className={`tcg-type-chip ${selectedTypes.has(id) ? 'active' : ''}`}
                  style={selectedTypes.has(id) ? { background: color + '22', borderColor: color, color } : {}}
                  onClick={() => toggleType(id)}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Count + generate */}
          <div className="tcg-bottom-row">
            <div className="tcg-field tcg-count-field">
              <label>Number of Test Cases</label>
              <div className="tcg-count-row">
                <div className="tcg-count-presets">
                  {COUNT_PRESETS.map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`tcg-count-chip ${count === n ? 'active' : ''}`}
                      onClick={() => setCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="tcg-count-input"
                  value={count}
                  min={1}
                  onChange={e => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
              {count > 30 && (
                <p className="tcg-count-hint">
                  Large counts may yield fewer cases than requested due to API limits — all generated cases will be recovered automatically.
                </p>
              )}
            </div>

            <button
              className="tcg-generate-btn"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="tcg-spinner" />
                  Generating…
                </>
              ) : (
                <>⚡ Generate Test Cases</>
              )}
            </button>
          </div>

          {loading && (
            <div className="tcg-loading-stage">
              {analyzingShot && (
                <div className="tcg-analyze-status">
                  <span className="tcg-spinner tcg-spinner-blue" />
                  <span>Analyzing screenshot with AI vision model…</span>
                </div>
              )}
              {/* B.L.A.S.T. phase tracker */}
              <div className="blast-phase-tracker">
                {BLAST_PHASES.map((phase, idx) => (
                  <div
                    key={phase.letter}
                    className={`blast-phase-step ${idx < stageIdx ? 'done' : ''} ${idx === stageIdx ? 'active' : ''}`}
                  >
                    <div className="blast-phase-dot">
                      {idx < stageIdx ? '✓' : phase.letter}
                    </div>
                    <div className="blast-phase-info">
                      <span className="blast-phase-name">{phase.name}</span>
                      {idx === stageIdx && (
                        <span className="blast-phase-desc">{phase.desc}…</span>
                      )}
                    </div>
                    {idx < BLAST_PHASES.length - 1 && (
                      <div className={`blast-phase-connector ${idx < stageIdx ? 'done' : ''}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="tcg-loading-bar"><div className="tcg-loading-progress" /></div>
            </div>
          )}

          {error && (
            <div className={`tcg-error-banner ${errorMeta?.isRateLimit ? 'tcg-error-quota' : ''}`}>
              <span>{errorMeta?.isRateLimit ? '🚦' : '⚠️'}</span>
              <div>
                <strong>{errorMeta?.isRateLimit ? 'Daily Quota Exhausted' : 'Generation Failed'}</strong>
                {errorMeta?.isRateLimit ? (
                  <>
                    <p>All available AI models have reached their free-tier daily token limit.</p>
                    {errorMeta.retryAfter && (
                      <p className="tcg-retry-time">⏱ Retry after: <strong>{errorMeta.retryAfter}</strong></p>
                    )}
                    <p className="tcg-quota-tip">
                      Tip: upgrade to GROQ Dev Tier for higher limits, or try again tomorrow when quotas reset.
                    </p>
                  </>
                ) : (
                  <p>{error}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────── */}
      {testCases.length > 0 && (
        <div className="tcg-results">

          {/* Stats bar */}
          <div className="tcg-results-header">
            <div className="tcg-results-info">
              <h2>
                {testCases.length} Test Cases Generated
                {selected.size > 0 && <span className="tcg-selected-badge">{selected.size} selected</span>}
              </h2>
              <p>Click ▸ on a row to expand details • Use checkboxes to select for targeted export</p>
            </div>
            <button className={`history-save-btn${savedFlash ? ' saved' : ''}`} onClick={handleSave}>
              {savedFlash ? '✓ Saved' : '💾 Save'}
            </button>
          </div>

          {modelUsed && (
            <div className="tcg-fallback-notice">
              <span>🔄</span>
              <span>Primary model was rate-limited. Generated using <strong>{modelUsed}</strong> (fallback).</span>
            </div>
          )}

          {/* Type summary chips */}
          <div className="tcg-type-summary">
            <button
              className={`tcg-filter-chip ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({testCases.length})
            </button>
            {Object.entries(typeCounts).map(([type, cnt]) => {
              const info = TEST_TYPES.find(t => t.label === type);
              return (
                <button
                  key={type}
                  className={`tcg-filter-chip ${filterType === type.toLowerCase() ? 'active' : ''}`}
                  style={info ? { borderColor: info.color, color: info.color } : {}}
                  onClick={() => setFilterType(filterType === type.toLowerCase() ? 'all' : type.toLowerCase())}
                >
                  {info?.icon || ''} {type} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Export bar */}
          <div className="tcg-export-bar">
            <span className="tcg-export-label">
              Export {selected.size > 0 ? `${selected.size} selected` : 'all'} to:
            </span>
            {EXPORT_ACTIONS.map(({ tool, format, label, icon, hint }) => (
              <button
                key={`${tool}-${format}`}
                className={`tcg-export-btn tcg-export-${format === 'excel' ? 'excel' : tool}`}
                onClick={() => handleExport({ tool, format })}
                title={hint}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="tcg-search-bar">
            <span className="tcg-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by ID, summary or component…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="tcg-search-clear" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>

          {/* Table */}
          <TestCaseTable
            testCases={visibleTCs}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onEdit={setEditingTc}
            onCreateDefect={setDefectTarget}
          />

          {visibleTCs.length === 0 && (
            <div className="tcg-empty">No test cases match current filter.</div>
          )}
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editingTc && (
        <EditModal
          tc={editingTc}
          onSave={handleSaveEdit}
          onClose={() => setEditingTc(null)}
        />
      )}

      {/* ── Create Defect Modal ──────────────────────────── */}
      {defectTarget && (
        <CreateDefectModal
          tc={defectTarget}
          onClose={() => setDefectTarget(null)}
          onDefectCreated={(tcId, defectId, defectUrl) => {
            handleDefectCreated(tcId, defectId, defectUrl);
            setDefectTarget(null);
          }}
        />
      )}
    </div>
  );
}
