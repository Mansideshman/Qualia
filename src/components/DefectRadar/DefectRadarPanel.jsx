/**
 * DefectRadarPanel.jsx
 * DefectRadarPanel — AI-powered bug detection & root cause intelligence
 */

import React, { useState, useRef, useCallback } from 'react';
import { useConfig } from '../../context/ConfigContext';
import DefectRadarService from '../../services/defectRadarService';
import DefectTicketDisplay from './DefectTicketDisplay';
import '../styles/DefectRadar.css';

const APP_TYPES = [
  'Web Application (Browser)',
  'Desktop Application',
  'Mobile Web (Browser)',
  'Enterprise Portal / Intranet',
  'REST API / Backend Service',
  'E-Commerce Platform',
  'Admin Dashboard',
  'Mobile Native App',
];

const ENVIRONMENTS = ['Production', 'Staging', 'UAT', 'QA', 'Dev'];

const BROWSERS = [
  'Chrome (latest)', 'Firefox (latest)', 'Safari (latest)', 'Edge (latest)',
  'Chrome Mobile', 'Safari Mobile', 'Not applicable',
];

const BLAST_STAGES = [
  { letter: 'B', name: 'Blueprint',  desc: 'Parsing evidence & mapping defect context' },
  { letter: 'L', name: 'Link',       desc: 'Connecting to AI forensic engine' },
  { letter: 'A', name: 'Architect',  desc: 'Root cause forensic analysis' },
  { letter: 'S', name: 'Stylize',    desc: 'Formatting structured bug tickets' },
  { letter: 'T', name: 'Trigger',    desc: 'Finalising report & tracker export' },
];

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

  /* ── Upload state ── */
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

  /* ── Analyse ───────────────────────────────────────── */
  const handleAnalyse = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    setStageIdx(0);

    try {
      if (!isGroqConfigured) throw new Error('GROQ API key not configured. Go to Settings.');
      if (!appName.trim()) throw new Error('Please enter the application name.');
      if (!actual.trim() && uploadedFiles.length === 0)
        throw new Error('Please describe the actual problem or upload a screenshot / log file.');

      const service = new DefectRadarService(config.groq.apiKey);

      [1, 2, 3, 4].forEach(i => setTimeout(() => setStageIdx(i), i * 800));

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
        appContext: { appName, appType, appUrl, environment, browser, os, userRole, resolution, appVersion },
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
            <div className="dr-stat"><span className="dr-stat-num">Multi</span><span className="dr-stat-label">Tracker Export</span></div>
            <div className="dr-stat"><span className="dr-stat-num">7</span><span className="dr-stat-label">Analysis Dimensions</span></div>
            <div className="dr-stat"><span className="dr-stat-num">Auto</span><span className="dr-stat-label">Push to Tracker</span></div>
            <div className="dr-stat"><span className="dr-stat-num">AI</span><span className="dr-stat-label">Root Cause</span></div>
          </div>
        </div>
      </div>

      <form onSubmit={handleAnalyse}>

        {/* ── Section 01: Upload Evidence ── */}
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

        {/* ── Section 02: Application Context ── */}
        <div className="defect-card">
          <div className="defect-section-title">
            <span className="defect-section-num">02</span>
            Application Context
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
          </div>
        </div>

        {/* ── Section 03: Bug Description ── */}
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
      {result && <DefectTicketDisplay result={result} />}
    </div>
  );
}
