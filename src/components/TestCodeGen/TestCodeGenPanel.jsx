import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useHistory } from '../../context/HistoryContext';
import '../History/HistoryPanel.css';
import { useConfig } from '../../context/ConfigContext';
import TestCodeGenService, { FRAMEWORKS } from '../../services/testCodeGenService';
import '../styles/TestCodeGen.css';

const BLAST_PHASES = [
  { key: 'B', label: 'Blueprint',  desc: 'Analyzing flow & identifying page objects…'  },
  { key: 'L', label: 'Link',       desc: 'Mapping interactions to locators…'             },
  { key: 'A', label: 'Architect',  desc: 'Generating Page Object Model classes…'         },
  { key: 'S', label: 'Stylize',    desc: 'Adding assertions, hooks & data patterns…'     },
  { key: 'T', label: 'Trigger',    desc: 'Building CI config & runnable scripts…'        },
];

const INPUT_MODES = { FLOW: 'flow', SCREENSHOT: 'screenshot' };

const FILE_ICONS = {
  ts:   '🔵', js: '🟡', py: '🐍', java: '☕',
  json: '📋', xml: '📄', cfg: '⚙️', txt: '📝', md: '📖',
};

function fileIcon(filename) {
  const ext = filename.split('.').pop();
  return FILE_ICONS[ext] || '📄';
}

const LANG_COLORS = {
  typescript: '#3b82f6',
  javascript: '#f59e0b',
  python:     '#22c55e',
  java:       '#f97316',
  json:       '#8b5cf6',
  xml:        '#64748b',
  text:       '#64748b',
};

export default function TestCodeGenPanel() {
  const { saveItem, pendingRestore, clearPendingRestore } = useHistory();
  const [savedFlash, setSavedFlash] = useState(false);
  const { config } = useConfig();

  /* ── Framework / mode state ──────────────────────── */
  const [framework, setFramework]   = useState('playwright');
  const [language,  setLanguage]    = useState('TypeScript');
  const [inputMode, setInputMode]   = useState(INPUT_MODES.FLOW);

  /* ── Input state ──────────────────────────────────── */
  const [flow,        setFlow]        = useState('');
  const [appUrl,      setAppUrl]      = useState('');
  const [shotFile,    setShotFile]    = useState(null);
  const [shotPreview, setShotPreview] = useState('');
  const [isDragOver,  setIsDragOver]  = useState(false);
  const fileRef = useRef(null);

  /* ── Feature options ─────────────────────────────── */
  const [options, setOptions] = useState({
    hooks:      true,
    dataDriven: false,
    assertions: true,
    ciConfig:   true,
  });

  /* ── Generation state ────────────────────────────── */
  const [loading,    setLoading]    = useState(false);
  const [blastPhase, setBlastPhase] = useState(0);
  const [error,      setError]      = useState('');

  /* ── Results state ───────────────────────────────── */
  const [result,      setResult]      = useState(null);
  const [activeFile,  setActiveFile]  = useState(0);
  const [uiDesc,      setUiDesc]      = useState('');

  useEffect(() => {
    if (pendingRestore?.type === 'codegen') {
      const d = pendingRestore.data;
      if (d.framework) setFramework(d.framework);
      if (d.language)  setLanguage(d.language);
      if (d.flow)      setFlow(d.flow);
      if (d.result)    setResult(d.result);
      clearPendingRestore();
    }
  }, [pendingRestore, clearPendingRestore]);

  const handleSave = useCallback(() => {
    if (!result?.length) return;
    const title = `${framework} · ${language} — ${flow.slice(0, 40) || 'Code'}`;
    saveItem('codegen', title, { framework, language, flow, result: { files: result } });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [result, framework, language, flow, saveItem]);

  /* ── Selector Lab state ───────────────────────────── */
  const [labHtml,    setLabHtml]    = useState('');
  const [labDesc,    setLabDesc]    = useState('');
  const [labResult,  setLabResult]  = useState('');
  const [labLoading, setLabLoading] = useState(false);
  const [labError,   setLabError]   = useState('');

  /* ── Framework switch — reset language ───────────── */
  const switchFramework = (fw) => {
    setFramework(fw);
    setLanguage(FRAMEWORKS[fw].defaultLang);
    setResult(null);
    setError('');
  };

  /* ── Screenshot handling ─────────────────────────── */
  const loadShot = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setShotFile(file);
      setShotPreview(e.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const clearShot = (e) => {
    e.stopPropagation();
    setShotFile(null);
    setShotPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── Toggle option ───────────────────────────────── */
  const toggleOption = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Generate ────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    const hasInput = inputMode === INPUT_MODES.FLOW ? flow.trim().length > 5 : !!shotFile;
    if (!hasInput) {
      setError(inputMode === INPUT_MODES.FLOW
        ? 'Please describe the test flow (e.g. "User logs in, adds item to cart, checks out").'
        : 'Please upload a UI screenshot.');
      return;
    }
    if (!config.groq?.apiKey) {
      setError('GROQ API key not configured. Go to Settings.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);
    setUiDesc('');
    setBlastPhase(0);

    const phaseTimer = setInterval(() => {
      setBlastPhase(prev => (prev < BLAST_PHASES.length - 1 ? prev + 1 : prev));
    }, 3500);

    try {
      const service = new TestCodeGenService(config.groq.apiKey);
      let res;

      if (inputMode === INPUT_MODES.FLOW) {
        res = await service.generateFromFlow({ flow, framework, language, appUrl, options });
      } else {
        const base64 = shotPreview.split(',')[1];
        const mime   = shotFile.type || 'image/png';
        res = await service.generateFromScreenshot({ base64Image: base64, mimeType: mime, framework, language, appUrl, options });
      }

      clearInterval(phaseTimer);

      if (!res.success) {
        setError(res.error || 'Generation failed. Please try again.');
        setLoading(false);
        return;
      }

      setResult(res.files);
      setActiveFile(0);
      if (res.uiDescription) setUiDesc(res.uiDescription);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      clearInterval(phaseTimer);
      setLoading(false);
      setBlastPhase(0);
    }
  }, [flow, framework, language, appUrl, inputMode, shotFile, shotPreview, options, config]);

  /* ── Selector Lab ────────────────────────────────── */
  const handleSelectorLab = useCallback(async () => {
    if (!labHtml.trim() && !labDesc.trim()) {
      setLabError('Paste some HTML or describe the element.');
      return;
    }
    if (!config.groq?.apiKey) {
      setLabError('GROQ API key not configured.');
      return;
    }

    setLabError('');
    setLabLoading(true);
    setLabResult('');

    try {
      const service = new TestCodeGenService(config.groq.apiKey);
      const res = await service.generateSelectors({ htmlSnippet: labHtml, elementDescription: labDesc });
      if (!res.success) { setLabError(res.error); return; }
      setLabResult(res.content);
    } catch (err) {
      setLabError(`Error: ${err.message}`);
    } finally {
      setLabLoading(false);
    }
  }, [labHtml, labDesc, config]);

  /* ── Download ────────────────────────────────────── */
  const downloadFile = (file) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = file.name.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    if (!result) return;
    result.forEach((f, i) => {
      setTimeout(() => downloadFile(f), i * 100);
    });
  };

  /* ── Parse Selector Lab output into sections ─────── */
  const parseSelectorOutput = (raw) => {
    const sections = [];
    const lines = raw.split('\n');
    let current = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^(PLAYWRIGHT|CYPRESS|SELENIUM-PYTHON|SELENIUM-JAVA|RECOMMENDED_TESTID|STABILITY_NOTES):/.test(trimmed)) {
        if (current) sections.push(current);
        current = { label: trimmed.replace(':', ''), lines: [] };
      } else if ((current && trimmed.startsWith('  ')) || (current && !trimmed.includes(':'))) {
        current.lines.push(trimmed);
      } else if (!current) {
        sections.push({ label: 'Info', lines: [trimmed] });
      }
    }
    if (current) sections.push(current);
    return sections;
  };

  const fw = FRAMEWORKS[framework];

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="tcg2-panel">

      {/* Header */}
      <div className="tcg2-header">
        <div className="tcg2-header-left">
          <div className="tcg2-header-icon">🎭</div>
          <div>
            <h1 className="tcg2-title">Test Code Generator</h1>
            <p className="tcg2-subtitle">
              Describe a flow → AI generates Page Object Model code for Playwright, Cypress or Selenium
            </p>
          </div>
        </div>
        <div className="tcg2-header-badges">
          <span className="tcg2-badge tcg2-badge-pom">POM Ready</span>
        </div>
      </div>

      {/* Framework selector */}
      <div className="tcg2-fw-bar">
        {Object.values(FRAMEWORKS).map(f => (
          <button
            key={f.id}
            className={`tcg2-fw-btn${framework === f.id ? ' active' : ''}`}
            style={framework === f.id ? { borderColor: f.color, color: f.color } : {}}
            onClick={() => switchFramework(f.id)}
          >
            <span className="tcg2-fw-icon">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Input section */}
      <div className="tcg2-input-card">

        {/* Mode toggle */}
        <div className="tcg2-mode-toggle">
          <button
            className={`tcg2-mode-btn${inputMode === INPUT_MODES.FLOW ? ' active' : ''}`}
            onClick={() => { setInputMode(INPUT_MODES.FLOW); setError(''); }}
          >
            💬 Natural Language
          </button>
          <button
            className={`tcg2-mode-btn${inputMode === INPUT_MODES.SCREENSHOT ? ' active' : ''}`}
            onClick={() => { setInputMode(INPUT_MODES.SCREENSHOT); setError(''); }}
          >
            🖼️ Screenshot / UI
          </button>
        </div>

        {/* Flow input */}
        {inputMode === INPUT_MODES.FLOW && (
          <div className="tcg2-flow-area">
            <label className="tcg2-input-label">Describe the test flow</label>
            <textarea
              className="tcg2-flow-textarea"
              placeholder={'Example: User navigates to /login, enters email "user@example.com" and password, clicks Login, lands on dashboard, adds "Blue Widget" to cart, proceeds to checkout, fills shipping form with name "John Doe" and address, clicks Place Order, sees order confirmation with order ID.'}
              value={flow}
              onChange={(e) => setFlow(e.target.value)}
              rows={5}
            />
          </div>
        )}

        {/* Screenshot input */}
        {inputMode === INPUT_MODES.SCREENSHOT && (
          <div className="tcg2-shot-area">
            <div
              className={`tcg2-shot-drop${isDragOver ? ' drag-over' : ''}${shotFile ? ' has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) loadShot(f); }}
              onClick={() => !shotFile && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && loadShot(e.target.files[0])}
              />
              {shotFile ? (
                <div className="tcg2-shot-preview">
                  <img src={shotPreview} alt="UI screenshot" className="tcg2-shot-img" />
                  <div className="tcg2-shot-overlay">
                    <span className="tcg2-shot-name">{shotFile.name}</span>
                    <button className="tcg2-shot-remove" onClick={clearShot}>✕ Remove</button>
                  </div>
                </div>
              ) : (
                <div className="tcg2-shot-drop-inner">
                  <div className="tcg2-shot-icon">🖼️</div>
                  <div className="tcg2-shot-drop-title">Drop a UI screenshot here</div>
                  <div className="tcg2-shot-drop-sub">AI will extract elements and generate POM code · PNG, JPG, WebP</div>
                  <div className="tcg2-shot-drop-btn">Browse Image</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Options row */}
        <div className="tcg2-options-row">
          <div className="tcg2-opt-group tcg2-opt-grow">
            <label className="tcg2-opt-label">App Base URL</label>
            <input
              className="tcg2-opt-input"
              type="url"
              placeholder="https://app.yourapp.com"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
            />
          </div>

          <div className="tcg2-opt-group tcg2-opt-narrow">
            <label className="tcg2-opt-label">Language</label>
            <select
              className="tcg2-opt-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {fw.languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Feature toggles */}
        <div className="tcg2-toggles">
          {[
            { key: 'hooks',      label: 'beforeEach / afterEach Hooks', icon: '🔄' },
            { key: 'assertions', label: 'Rich Assertions',               icon: '✅' },
            { key: 'dataDriven', label: 'Data-Driven Tests',             icon: '📊' },
            { key: 'ciConfig',   label: 'CI-Ready Config',               icon: '🚀' },
          ].map(o => (
            <button
              key={o.key}
              className={`tcg2-toggle${options[o.key] ? ' on' : ''}`}
              onClick={() => toggleOption(o.key)}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          className="tcg2-generate-btn"
          onClick={handleGenerate}
          disabled={loading}
          style={{ '--fw-color': fw.color }}
        >
          {loading ? '⏳ Generating…' : `⚡ Generate ${fw.label} Code`}
        </button>

        {error && (
          <div className="tcg2-error">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* B.L.A.S.T. tracker */}
      {loading && (
        <div className="tcg2-blast">
          <div className="tcg2-blast-header">
            <span className="tcg2-blast-spin" />
            B.L.A.S.T. Code Generation in Progress
          </div>
          <div className="tcg2-blast-phases">
            {BLAST_PHASES.map((p, i) => (
              <div
                key={p.key}
                className={`tcg2-blast-phase${i < blastPhase ? ' done' : ''}${i === blastPhase ? ' active' : ''}`}
              >
                <div className="tcg2-blast-letter">{p.key}</div>
                <div className="tcg2-blast-phase-name">{p.label}</div>
                {i === blastPhase && <div className="tcg2-blast-phase-desc">{p.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UI description (screenshot mode) */}
      {uiDesc && (
        <div className="tcg2-ui-desc">
          <div className="tcg2-ui-desc-header">🔍 AI Extracted UI Elements</div>
          <pre className="tcg2-ui-desc-text">{uiDesc}</pre>
        </div>
      )}

      {/* Results */}
      {result && result.length > 0 && (
        <div className="tcg2-results">
          <div className="tcg2-results-header">
            <div className="tcg2-results-title">
              <span style={{ color: fw.color }}>{fw.icon}</span>
              {result.length} file{result.length !== 1 ? 's' : ''} generated — {fw.label} ({language})
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button className={`history-save-btn${savedFlash ? ' saved' : ''}`} onClick={handleSave}>
                {savedFlash ? '✓ Saved' : '💾 Save'}
              </button>
              <button className="tcg2-download-all" onClick={downloadAll}>
                ⬇ Download All Files
              </button>
            </div>
          </div>

          {/* File tab bar */}
          <div className="tcg2-file-tabs">
            {result.map((f, i) => (
              <button
                key={i}
                className={`tcg2-file-tab${activeFile === i ? ' active' : ''}`}
                onClick={() => setActiveFile(i)}
              >
                <span className="tcg2-file-tab-icon">{fileIcon(f.name)}</span>
                <span className="tcg2-file-tab-name">{f.name.split('/').pop()}</span>
              </button>
            ))}
          </div>

          {/* Code viewer */}
          {result[activeFile] && (
            <div className="tcg2-code-viewer">
              <div className="tcg2-code-bar">
                <div className="tcg2-code-bar-left">
                  <span
                    className="tcg2-lang-dot"
                    style={{ background: LANG_COLORS[result[activeFile].lang] || '#64748b' }}
                  />
                  <span className="tcg2-code-filename">{result[activeFile].name}</span>
                  <span className="tcg2-lang-chip">{result[activeFile].lang}</span>
                </div>
                <button
                  className="tcg2-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(result[activeFile].content);
                  }}
                >
                  📋 Copy
                </button>
                <button
                  className="tcg2-dl-btn"
                  onClick={() => downloadFile(result[activeFile])}
                >
                  ⬇ Download
                </button>
              </div>
              <pre className="tcg2-code-block">
                <code>{result[activeFile].content}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Selector Lab ──────────────────────────────── */}
      <div className="tcg2-lab">
        <div className="tcg2-lab-header">
          <div className="tcg2-lab-title">
            <span className="tcg2-lab-icon">🔬</span>
            Selector Lab
            <span className="tcg2-lab-badge">Like Playwright CodeGen</span>
          </div>
          <p className="tcg2-lab-sub">
            Paste HTML or describe an element → get best locators for all 3 frameworks
          </p>
        </div>

        <div className="tcg2-lab-body">
          <div className="tcg2-lab-inputs">
            <div className="tcg2-lab-group">
              <label className="tcg2-opt-label">Paste HTML snippet</label>
              <textarea
                className="tcg2-lab-textarea"
                placeholder={'<button class="btn-primary" aria-label="Submit order">\n  Place Order\n</button>'}
                value={labHtml}
                onChange={(e) => setLabHtml(e.target.value)}
                rows={4}
                spellCheck={false}
              />
            </div>
            <div className="tcg2-lab-or">or</div>
            <div className="tcg2-lab-group">
              <label className="tcg2-opt-label">Describe the element</label>
              <input
                className="tcg2-opt-input"
                placeholder='e.g. "The blue Place Order button in the checkout footer"'
                value={labDesc}
                onChange={(e) => setLabDesc(e.target.value)}
              />
            </div>
          </div>

          <button
            className="tcg2-lab-btn"
            onClick={handleSelectorLab}
            disabled={labLoading || (!labHtml.trim() && !labDesc.trim())}
          >
            {labLoading ? '⏳ Generating…' : '🔬 Generate Selectors'}
          </button>

          {labError && (
            <div className="tcg2-error" style={{ marginTop: 8 }}>
              <span>⚠️</span> {labError}
            </div>
          )}

          {labResult && (
            <div className="tcg2-lab-results">
              {parseSelectorOutput(labResult).map((section, i) => (
                <div key={i} className="tcg2-lab-section">
                  <div className="tcg2-lab-section-label">{section.label}</div>
                  <div className="tcg2-lab-section-body">
                    {section.lines.map((line, j) => (
                      <div key={j} className="tcg2-lab-line">
                        <code>{line}</code>
                        <button
                          className="tcg2-lab-copy"
                          title="Copy"
                          onClick={() => navigator.clipboard.writeText(line)}
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
