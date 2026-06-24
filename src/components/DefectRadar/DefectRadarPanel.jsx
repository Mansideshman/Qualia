/**
 * DefectRadarPanel.jsx
 * DefectRadarPanel — AI-powered bug detection & root cause intelligence
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { useHistory } from '../../context/HistoryContext';
import '../History/HistoryPanel.css';
import DefectRadarService from '../../services/defectRadarService';
import DefectTicketDisplay from './DefectTicketDisplay';
import '../styles/DefectRadar.css';

const APP_TYPES = [
  // Web
  'Web Application (Browser)',
  'Single Page Application (SPA)',
  'Progressive Web App (PWA)',
  'E-Commerce Platform',
  'Admin Dashboard / CMS',
  'Enterprise Portal / Intranet',
  // Mobile
  'Mobile Native — iOS (Swift/Obj-C)',
  'Mobile Native — Android (Kotlin/Java)',
  'Mobile Cross-Platform (React Native / Flutter)',
  'Mobile Web (Browser)',
  // Backend & API
  'REST API / Backend Service',
  'GraphQL API',
  'Microservices / Cloud-Native',
  'CLI Tool / Script',
  // Desktop
  'Desktop Application (Windows)',
  'Desktop Application (macOS)',
  'Desktop Application (Linux / Electron)',
  // Embedded & IoT
  'Embedded / Firmware System',
  'IoT Device / Edge Computing',
  // Specialized
  'AI / ML Platform',
  'Blockchain / Web3 (Smart Contracts)',
  'Gaming Application',
  'Healthcare / MedTech System',
  'Financial / FinTech Platform',
  'Data Pipeline / ETL',
];

const ENVIRONMENTS = ['Production', 'Staging', 'UAT', 'QA', 'Dev', 'On-Device / Hardware'];

const BROWSERS = [
  // Web
  'Chrome (latest)', 'Firefox (latest)', 'Safari (latest)', 'Edge (latest)',
  'Chrome Mobile', 'Safari Mobile',
  // Mobile native
  'iOS Native App', 'Android Native App', 'React Native / Flutter App',
  // Desktop / tools
  'Electron (Desktop App)', 'Postman / REST Client', 'CLI / Terminal',
  'Not applicable / Firmware',
];

const BLAST_STAGES = [
  { letter: 'B', name: 'Blueprint',  desc: 'Parsing evidence & mapping defect context' },
  { letter: 'L', name: 'Link',       desc: 'Connecting to AI forensic engine' },
  { letter: 'A', name: 'Architect',  desc: 'Root cause forensic analysis' },
  { letter: 'S', name: 'Stylize',    desc: 'Formatting structured bug tickets' },
  { letter: 'T', name: 'Trigger',    desc: 'Finalising report & tracker export' },
];

const PANEL_MODES = { QUICK: 'quick', FULL: 'full' };

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_MB = 10;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(file) {
  if (file.name.endsWith('.har')) return '🌐';
  if (file.name.endsWith('.log')) return '📋';
  if (file.name.endsWith('.json')) return '{}';
  return '📄';
}

export default function DefectRadarPanel() {
  const { config } = useConfig();
  const { saveItem } = useHistory();
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = useCallback(() => {
    if (!result) return;
    const title = appName || result?.title || 'Defect Analysis';
    saveItem('defect', title, { result, appName });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [result, appName, saveItem]);

  /* ── Mode ── */
  const [panelMode, setPanelMode] = useState(PANEL_MODES.QUICK);

  /* ── Quick mode state ── */
  const [quickFile,     setQuickFile]     = useState(null);
  const [quickPreview,  setQuickPreview]  = useState('');
  const [quickAppName,  setQuickAppName]  = useState('');
  const [quickNote,     setQuickNote]     = useState('');
  const [quickDragOver, setQuickDragOver] = useState(false);
  const quickFileRef = useRef(null);

  /* ── Upload state (full mode) ── */
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver]       = useState(false);
  const fileInputRef = useRef(null);

  /* ── App context ── */
  const [appName,     setAppName]     = useState('');
  const [appType,     setAppType]     = useState(APP_TYPES[0]);
  const [appUrl,      setAppUrl]      = useState('');
  const [environment, setEnvironment] = useState(ENVIRONMENTS[0]);
  const [browser,     setBrowser]     = useState(BROWSERS[0]);
  const [os,          setOs]          = useState('');
  const [userRole,    setUserRole]    = useState('');
  const [resolution,  setResolution]  = useState('');
  const [appVersion,  setAppVersion]  = useState('');
  const [locale,      setLocale]      = useState('');
  const [autoDetected, setAutoDetected] = useState(false);

  /* ── Auto-detect environment on mount ── */
  useEffect(() => {
    const ua = navigator.userAgent;
    let detectedBrowser = 'Chrome (latest)';
    if (/Edg\//.test(ua))            detectedBrowser = 'Edge (latest)';
    else if (/Firefox\//.test(ua))   detectedBrowser = 'Firefox (latest)';
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) detectedBrowser = 'Safari (latest)';
    else if (/Chrome\//.test(ua) && /Mobile/.test(ua))    detectedBrowser = 'Chrome Mobile';

    let detectedOs = '';
    if (/Windows NT 10/.test(ua))      detectedOs = 'Windows 11';
    else if (/Windows NT/.test(ua))    detectedOs = 'Windows 10';
    else if (/Mac OS X/.test(ua))      detectedOs = 'macOS ' + (ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || '');
    else if (/Android/.test(ua))       detectedOs = 'Android ' + (ua.match(/Android ([0-9.]+)/)?.[1] || '');
    else if (/iPhone|iPad/.test(ua))   detectedOs = 'iOS ' + (ua.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || '');
    else if (/Linux/.test(ua))         detectedOs = 'Linux';

    const detectedRes = `${window.screen.width}×${window.screen.height} (viewport ${window.innerWidth}×${window.innerHeight})`;
    const detectedLocale = navigator.language || '';

    setBrowser(detectedBrowser);
    setOs(detectedOs);
    setResolution(detectedRes);
    setLocale(detectedLocale);
    setAutoDetected(true);
  }, []);

  /* ── Bug description ── */
  const [whatDoing,  setWhatDoing]  = useState('');
  const [expected,   setExpected]   = useState('');
  const [actual,     setActual]     = useState('');
  const [additional, setAdditional] = useState('');

  /* ── Generation state ── */
  const [loading,  setLoading]  = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const isGroqConfigured = !!config?.groq?.apiKey;

  /* ── File handling ─────────────────────────────────── */
  const processFiles = useCallback((fileList) => {
    const incoming = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isText  = file.type.startsWith('text/')
        || file.type === 'application/json'
        || file.name.endsWith('.log')
        || file.name.endsWith('.har')
        || file.name.endsWith('.txt')
        || file.name.endsWith('.json');

      if (!isImage && !isText) {
        setError(`"${file.name}" — unsupported type. Use PNG, JPG, WebP, .log, .har, .txt, .json`);
        continue;
      }
      incoming.push({
        file,
        name: file.name,
        size: file.size,
        type: isImage ? 'image' : 'text',
        preview: isImage ? URL.createObjectURL(file) : null,
      });
    }
    if (incoming.length) {
      setUploadedFiles(prev => [...prev, ...incoming]);
      setError('');
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);

  const removeFile = (idx) => {
    setUploadedFiles(prev => {
      const f = prev[idx];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ── Quick mode file handling ──────────────────────── */
  const loadQuickFile = (file) => {
    if (!file) return;
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    if (!isImage) { setError('Please upload an image file (PNG, JPG, WebP, GIF).'); return; }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit.`); return;
    }
    setError('');
    setQuickFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setQuickPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const onQuickDrop = (e) => {
    e.preventDefault();
    setQuickDragOver(false);
    loadQuickFile(e.dataTransfer.files?.[0]);
  };

  const clearQuickShot = () => {
    setQuickFile(null);
    setQuickPreview('');
    setResult(null);
  };

  /* ── Analyse ───────────────────────────────────────── */
  const handleAnalyse = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    setStageIdx(0);

    try {
      if (!isGroqConfigured) throw new Error('GROQ API key not configured. Go to Settings.');

      const service = new DefectRadarService(config.groq.apiKey);
      [1, 2, 3, 4].forEach(i => setTimeout(() => setStageIdx(i), i * 800));

      /* ── QUICK MODE ── screenshot only ── */
      if (panelMode === PANEL_MODES.QUICK) {
        if (!quickFile) throw new Error('Please upload a screenshot to analyse.');
        const dataUrl = await fileToBase64(quickFile);
        const analysisResult = await service.analyseEvidence({
          textDescription: {
            whatDoing: '',
            expected: '',
            actual: quickNote.trim() || 'Visual evidence provided via screenshot. Please analyse all visible defects, UX issues, and anomalies.',
            additional: '',
          },
          appContext: {
            appName:     quickAppName.trim() || 'Application Under Test',
            appType:     APP_TYPES[0],
            appUrl:      '',
            environment: ENVIRONMENTS[0],
            browser:     browser,
            os:          os,
            userRole:    '',
            resolution:  resolution,
            appVersion:  '',
            locale:      locale,
          },
          textFileContents:  [],
          imageBase64List:   [{ name: quickFile.name, dataUrl }],
        });
        if (!analysisResult.success) throw new Error(analysisResult.error);
        setResult(analysisResult.result);
        return;
      }

      /* ── FULL MODE ── existing form ── */
      if (!appName.trim()) throw new Error('Please enter the application name.');
      if (!actual.trim() && uploadedFiles.length === 0)
        throw new Error('Please describe the actual problem or upload a screenshot / log file.');

      const imageBase64List = [];
      const textFileContents = [];

      for (const f of uploadedFiles) {
        if (f.type === 'image') {
          const dataUrl = await fileToBase64(f.file);
          imageBase64List.push({ name: f.name, dataUrl });
        } else {
          const content = await fileToText(f.file);
          textFileContents.push({ name: f.name, content });
        }
      }

      const analysisResult = await service.analyseEvidence({
        textDescription: { whatDoing, expected, actual, additional },
        appContext: { appName, appType, appUrl, environment, browser, os, userRole, resolution, appVersion, locale },
        textFileContents,
        imageBase64List,
      });

      if (!analysisResult.success) throw new Error(analysisResult.error);
      setResult(analysisResult.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStageIdx(0);
    }
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="defect-panel">

      {/* Hero */}
      <div className="defect-hero-banner">
        <div className="dr-hero-inner">
          <div className="dr-hero-badge">AI Bug Intelligence</div>
          <h2 className="dr-hero-title">Defect Radar</h2>
          <p className="dr-hero-subtitle">
            AI-powered bug detection &amp; root cause intelligence. Upload screenshots, log files,
            or HAR traces — get structured bug tickets with forensic root cause analysis.
          </p>
          <div className="dr-hero-stats">
            <div className="dr-stat"><span className="dr-stat-num">25+</span><span className="dr-stat-label">Product Types</span></div>
            <div className="dr-stat"><span className="dr-stat-num">5</span><span className="dr-stat-label">Bug Trackers</span></div>
            <div className="dr-stat"><span className="dr-stat-num">7</span><span className="dr-stat-label">RICE-POT Dimensions</span></div>
            <div className="dr-stat"><span className="dr-stat-num">Auto</span><span className="dr-stat-label">Env Detection</span></div>
            <div className="dr-stat"><span className="dr-stat-num">AI</span><span className="dr-stat-label">Root Cause</span></div>
          </div>
        </div>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="dr-mode-toggle">
        <button
          type="button"
          className={`dr-mode-btn ${panelMode === PANEL_MODES.QUICK ? 'active' : ''}`}
          onClick={() => { setPanelMode(PANEL_MODES.QUICK); setResult(null); setError(''); }}
        >
          <span className="dr-mode-icon">📸</span>
          <div>
            <strong>Quick Screenshot</strong>
            <small>Drop a screenshot — AI detects all bugs instantly</small>
          </div>
        </button>
        <button
          type="button"
          className={`dr-mode-btn ${panelMode === PANEL_MODES.FULL ? 'active' : ''}`}
          onClick={() => { setPanelMode(PANEL_MODES.FULL); setResult(null); setError(''); }}
        >
          <span className="dr-mode-icon">📋</span>
          <div>
            <strong>Full Report</strong>
            <small>Logs · HAR · detailed context · multi-file</small>
          </div>
        </button>
      </div>

      <form onSubmit={handleAnalyse}>

        {/* ── QUICK SCREENSHOT MODE ── */}
        {panelMode === PANEL_MODES.QUICK && (
          <div className="defect-card dr-quick-card">
            <div className="defect-section-title">
              <span className="defect-section-num">AI</span>
              Screenshot Bug Analysis
              <span className="dr-quick-badge">Vision AI</span>
            </div>

            <input
              ref={quickFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { loadQuickFile(e.target.files?.[0]); e.target.value = ''; }}
            />

            {!quickPreview ? (
              <div
                className={`dr-quick-dropzone ${quickDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setQuickDragOver(true); }}
                onDragLeave={() => setQuickDragOver(false)}
                onDrop={onQuickDrop}
                onClick={() => quickFileRef.current?.click()}
              >
                <div className="dr-quick-dz-icon">📸</div>
                <p className="dr-quick-dz-title">Drop your screenshot here or click to upload</p>
                <p className="dr-quick-dz-hint">PNG · JPG · WebP · GIF &nbsp;·&nbsp; Max {MAX_FILE_SIZE_MB}MB</p>
                <p className="dr-quick-dz-hint">AI will automatically detect all bugs, UX issues &amp; anomalies</p>
              </div>
            ) : (
              <div className="dr-quick-preview-wrap">
                <div className="dr-quick-img-box">
                  <img src={quickPreview} alt="Screenshot to analyse" className="dr-quick-img" />
                  <button type="button" className="dr-quick-remove" onClick={clearQuickShot} title="Remove">✕</button>
                </div>
                <div className="dr-quick-img-meta">
                  <span className="dr-quick-filename">{quickFile?.name}</span>
                  <button type="button" className="dr-quick-change" onClick={() => quickFileRef.current?.click()}>
                    Change image
                  </button>
                </div>
              </div>
            )}

            <div className="dr-quick-optional-row">
              <div className="dr-field dr-quick-appname">
                <label>App / Feature Name <span style={{ fontWeight: 400, color: 'var(--gray-400,#9ca3af)' }}>(optional)</span></label>
                <input
                  type="text"
                  value={quickAppName}
                  onChange={e => setQuickAppName(e.target.value)}
                  placeholder="e.g. Customer Portal, Checkout Page"
                />
              </div>
              <div className="dr-field dr-quick-note">
                <label>Additional Context <span style={{ fontWeight: 400, color: 'var(--gray-400,#9ca3af)' }}>(optional)</span></label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={e => setQuickNote(e.target.value)}
                  placeholder="e.g. This page broke after yesterday's release"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Full mode sections ── */}
        {panelMode === PANEL_MODES.FULL && (
        <div className="defect-card">
          <div className="defect-section-title">
            <span className="defect-section-num">01</span>
            Upload Evidence
            <span className="defect-section-sub">Screenshots · Log files · HAR files · JSON</span>
          </div>

          {/* Drop zone — always visible, compact when files exist */}
          <div
            className={`dr-drop-zone ${isDragOver ? 'drag-over' : ''} ${uploadedFiles.length > 0 ? 'compact' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.log,.har,.txt,.json"
              style={{ display: 'none' }}
              onChange={(e) => processFiles(e.target.files)}
            />
            {uploadedFiles.length === 0 ? (
              <>
                <div className="dz-icon">📎</div>
                <p className="dz-title">Drag &amp; drop or click to upload evidence</p>
                <p className="dz-hint">PNG · JPG · WebP (screenshots) · .log · .har · .txt · .json</p>
                <p className="dz-hint">Max {MAX_FILE_SIZE_MB}MB per file · Multiple files supported</p>
                <div className="dz-type-chips">
                  {['PNG', 'JPG', 'WebP', '.log', '.har', '.json', '.txt'].map(t => (
                    <span key={t} className="dz-type-chip">{t}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="dz-compact-prompt">
                <span>📎</span>
                <span>Drop more files or <u>browse to add</u></span>
              </div>
            )}
          </div>

          {/* File list — displayed BELOW the drop zone, not inside */}
          {uploadedFiles.length > 0 && (
            <div className="dr-file-list">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="dr-file-item">
                  {f.type === 'image' ? (
                    <img src={f.preview} alt={f.name} className="dr-file-thumb" />
                  ) : (
                    <div className="dr-file-icon-box">{getFileIcon(f)}</div>
                  )}
                  <div className="dr-file-meta">
                    <span className="dr-file-name">{f.name}</span>
                    <span className="dr-file-size">{formatBytes(f.size)} · {f.type === 'image' ? 'Image' : 'Text'}</span>
                  </div>
                  <button
                    type="button"
                    className="dr-file-remove"
                    onClick={() => removeFile(i)}
                    title="Remove file"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {panelMode === PANEL_MODES.FULL && (
        <div className="defect-card">
          {/* Section 02: Application Context */}
          <div className="defect-section-title">
            <span className="defect-section-num">02</span>
            Application Context
            {autoDetected && (
              <span style={{ fontSize: '0.72rem', background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '2px 10px', borderRadius: 10, fontWeight: 700, marginLeft: 'auto' }}>
                ✅ Browser · OS · Screen auto-detected
              </span>
            )}
          </div>

          <div className="dr-form-grid-3">
            <div className="dr-field">
              <label>Application Name <span className="req">*</span></label>
              <input type="text" value={appName} onChange={e => setAppName(e.target.value)}
                placeholder="e.g., Customer Portal" required />
            </div>
            <div className="dr-field">
              <label>Application Type</label>
              <select value={appType} onChange={e => setAppType(e.target.value)}>
                {APP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="dr-field">
              <label>URL / Identifier</label>
              <input type="text" value={appUrl} onChange={e => setAppUrl(e.target.value)}
                placeholder="e.g., https://app.example.com/checkout" />
            </div>
            <div className="dr-field">
              <label>Environment</label>
              <select value={environment} onChange={e => setEnvironment(e.target.value)}>
                {ENVIRONMENTS.map(en => <option key={en}>{en}</option>)}
              </select>
            </div>
            <div className="dr-field">
              <label>Browser / Client</label>
              <select value={browser} onChange={e => setBrowser(e.target.value)}>
                {BROWSERS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="dr-field">
              <label>Operating System</label>
              <input type="text" value={os} onChange={e => setOs(e.target.value)}
                placeholder="e.g., Windows 11, macOS Sonoma" />
            </div>
            <div className="dr-field">
              <label>User Role</label>
              <input type="text" value={userRole} onChange={e => setUserRole(e.target.value)}
                placeholder="e.g., Admin, Standard User, Guest" />
            </div>
            <div className="dr-field">
              <label>Screen Resolution</label>
              <input type="text" value={resolution} onChange={e => setResolution(e.target.value)}
                placeholder="e.g., 1920×1080" />
            </div>
            <div className="dr-field">
              <label>App Version / Build</label>
              <input type="text" value={appVersion} onChange={e => setAppVersion(e.target.value)}
                placeholder="e.g., v2.4.1 or build #1234" />
            </div>
            <div className="dr-field">
              <label>Locale / Language</label>
              <input type="text" value={locale} onChange={e => setLocale(e.target.value)}
                placeholder="e.g., en-US, fr-FR, ja-JP, ar-SA" />
            </div>
          </div>
        </div>
        )}

        {panelMode === PANEL_MODES.FULL && (
        <div className="defect-card">
          <div className="defect-section-title">
            <span className="defect-section-num">03</span>
            Bug Description
          </div>

          <div className="dr-field" style={{ marginBottom: 16 }}>
            <label>What were you doing?</label>
            <textarea value={whatDoing} onChange={e => setWhatDoing(e.target.value)} rows={2}
              placeholder="e.g., I was on the checkout page, filled in card details, and clicked 'Pay Now'" />
          </div>

          <div className="dr-form-grid-2">
            <div className="dr-field">
              <label>Expected Behaviour</label>
              <textarea value={expected} onChange={e => setExpected(e.target.value)} rows={3}
                placeholder="e.g., Order confirmation page should appear and confirmation email sent" />
            </div>
            <div className="dr-field dr-field-actual">
              <label>
                Actual Behaviour — the problem <span className="req">*</span>
              </label>
              <textarea value={actual} onChange={e => setActual(e.target.value)} rows={3}
                placeholder="e.g., Page shows a blank white screen. No email received. Console: TypeError: Cannot read properties of undefined (reading 'orderId')" />
            </div>
          </div>

          <div className="dr-field" style={{ marginTop: 16 }}>
            <label>Additional Context</label>
            <textarea value={additional} onChange={e => setAdditional(e.target.value)} rows={2}
              placeholder="e.g., Started after yesterday's deployment. Only affects users with saved payment methods. Works in Staging." />
          </div>
        </div>
        )}

        {/* Errors / Warnings */}
        {error && (
          <div className="dr-error-banner">
            <span>⚠️</span>
            <div><strong>Error</strong><p>{error}</p></div>
          </div>
        )}
        {!isGroqConfigured && (
          <div className="dr-warning-banner">
            <span>🔑</span>
            <div>
              <strong>GROQ API Key Required</strong>
              <p>Go to Settings to configure your GROQ API key. Free at console.groq.com</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button type="submit" className="dr-analyse-btn" disabled={loading || !isGroqConfigured}>
          {loading ? (
            <><span className="dr-btn-spinner"></span>Analysing evidence...</>
          ) : (
            <><span>🔍</span>Analyse &amp; Generate Bug Tickets</>
          )}
        </button>
      </form>

      {/* BLAST loading stages */}
      {loading && (
        <div className="dr-loading-panel">
          <div className="dr-blast-stages">
            {BLAST_STAGES.map((s, i) => (
              <div key={s.letter}
                className={`dr-blast-stage ${i < stageIdx ? 'done' : ''} ${i === stageIdx ? 'active' : ''}`}>
                <div className="dr-blast-letter">{s.letter}</div>
                <div className="dr-blast-text">
                  <strong>{s.name}</strong>
                  <small>{s.desc}</small>
                </div>
              </div>
            ))}
          </div>
          <p className="dr-loading-label">AI forensic analysis in progress...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 24px 0' }}>
            <button className={`history-save-btn${savedFlash ? ' saved' : ''}`} onClick={handleSave}>
              {savedFlash ? '✓ Saved' : '💾 Save'}
            </button>
          </div>
          <DefectTicketDisplay result={result} appVersion={appVersion} />
        </>
      )}
    </div>
  );
}
