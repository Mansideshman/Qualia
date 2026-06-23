import React, { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { useConfig } from '../../context/ConfigContext';
import FrameworkForgeService, {
  FRAMEWORK_CONFIGS,
  detectLang,
  fileIcon,
  findFirstFile,
  updateById,
  removeById,
  addChild,
  countFiles,
} from '../../services/frameworkForgeService';
import '../styles/FrameworkForge.css';

const BLAST_PHASES = [
  { letter: 'B', label: 'Blueprint',  desc: 'Analyzing tech stack & planning architecture' },
  { letter: 'L', label: 'Link',       desc: 'Resolving file dependencies & import graph' },
  { letter: 'A', label: 'Architect',  desc: 'Generating config files & CI pipeline' },
  { letter: 'S', label: 'Stylize',    desc: 'Building page objects, tests & utilities' },
  { letter: 'T', label: 'Trigger',    desc: 'Assembling README & final artifacts' },
];

const DEFAULT_CONFIG = {
  framework: 'playwright-e2e',
  language: 'TypeScript',
  projectName: 'my-automation-framework',
  baseUrl: '',
  description: '',
  options: { linting: true, prettier: true, docker: false, allure: false },
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default function FrameworkForgePanel() {
  const { config: appConfig } = useConfig();
  const apiKey = appConfig.groq?.apiKey;

  /* ── State ──────────────────────────────────────────────── */
  const [config, setConfig]           = useState(DEFAULT_CONFIG);
  const [tree, setTree]               = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading]         = useState(false);
  const [blastPhase, setBlastPhase]   = useState(-1);
  const [error, setError]             = useState('');
  const [modelUsed, setModelUsed]     = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editName, setEditName]       = useState('');
  const [addingTo, setAddingTo]       = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [regenNodeId, setRegenNodeId] = useState(null);
  const [copied, setCopied]           = useState(false);
  const [isRateLimit, setIsRateLimit] = useState(false);

  const selectedIdRef = useRef(null);

  /* ── Framework change ───────────────────────────────────── */
  const handleFrameworkChange = useCallback((fwId) => {
    const fw = FRAMEWORK_CONFIGS[fwId];
    setConfig(prev => ({
      ...prev,
      framework: fwId,
      language: fw?.defaultLang || fw?.languages?.[0] || 'TypeScript',
    }));
  }, []);

  /* ── File select ────────────────────────────────────────── */
  const handleFileSelect = useCallback((node) => {
    if (selectedIdRef.current && editContent !== undefined) {
      setTree(prev => updateById(prev, selectedIdRef.current, () => ({ content: editContent })));
    }
    setSelectedNode(node);
    setEditContent(node.content || '');
    selectedIdRef.current = node.id;
  }, [editContent]);

  /* ── Content edit ───────────────────────────────────────── */
  const handleContentChange = useCallback((val) => {
    setEditContent(val);
    if (selectedIdRef.current) {
      setTree(prev => updateById(prev, selectedIdRef.current, () => ({ content: val })));
    }
  }, []);

  /* ── Toggle folder ──────────────────────────────────────── */
  const toggleFolder = useCallback((id) => {
    setTree(prev => updateById(prev, id, n => ({ expanded: !n.expanded })));
  }, []);

  /* ── Rename ─────────────────────────────────────────────── */
  const startRename = useCallback((node) => {
    setEditingId(node.id);
    setEditName(node.name);
  }, []);

  const commitRename = useCallback((node) => {
    const val = editName.trim();
    if (val && val !== node.name) {
      setTree(prev => updateById(prev, node.id, () => ({ name: val, lang: detectLang(val) })));
      if (selectedNode?.id === node.id) {
        setSelectedNode(prev => ({ ...prev, name: val, lang: detectLang(val) }));
      }
    }
    setEditingId(null);
    setEditName('');
  }, [editName, selectedNode]);

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = useCallback((id) => {
    if (!window.confirm('Delete this item and all its contents?')) return;
    setTree(prev => removeById(prev, id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
      setEditContent('');
      selectedIdRef.current = null;
    }
  }, [selectedNode]);

  /* ── Add item ───────────────────────────────────────────── */
  const startAdd = useCallback((parentId, type) => {
    setAddingTo({ parentId, type });
    setNewItemName('');
    if (parentId) {
      setTree(prev => updateById(prev, parentId, () => ({ expanded: true })));
    }
  }, []);

  const commitAdd = useCallback(() => {
    const name = newItemName.trim();
    if (!name) { setAddingTo(null); return; }

    const newNode = addingTo?.type === 'folder'
      ? { id: genId(), type: 'folder', name, expanded: true, children: [] }
      : { id: genId(), type: 'file', name, lang: detectLang(name), content: '' };

    if (addingTo?.parentId) {
      setTree(prev => addChild(prev, addingTo.parentId, newNode));
    } else {
      setTree(prev => [...prev, newNode]);
    }

    if (newNode.type === 'file') {
      setSelectedNode(newNode);
      setEditContent('');
      selectedIdRef.current = newNode.id;
    }

    setAddingTo(null);
    setNewItemName('');
  }, [addingTo, newItemName]);

  /* ── Generate framework ─────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError('No API key configured. Go to Settings and add your GROQ API key.');
      return;
    }
    setLoading(true);
    setError('');
    setIsRateLimit(false);
    setTree([]);
    setSelectedNode(null);
    setEditContent('');
    selectedIdRef.current = null;
    setBlastPhase(0);

    await delay(500);
    setBlastPhase(1);
    await delay(400);

    const service = new FrameworkForgeService(apiKey);
    const result = await service.generateFramework({
      ...config,
      onPhase: setBlastPhase,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      setIsRateLimit(!!result.isRateLimit);
      setBlastPhase(-1);
      return;
    }

    setTree(result.tree);
    setModelUsed(result.modelUsed || '');

    const first = findFirstFile(result.tree);
    if (first) {
      setSelectedNode(first);
      setEditContent(first.content || '');
      selectedIdRef.current = first.id;
    }
  }, [apiKey, config]);

  /* ── Regenerate single file ─────────────────────────────── */
  const handleRegenerateFile = useCallback(async (node) => {
    if (!node || node.type !== 'file' || !apiKey) return;
    setRegenNodeId(node.id);

    const service = new FrameworkForgeService(apiKey);
    const result = await service.regenerateFile({
      filePath: node.path || node.name,
      framework: config.framework,
      language: config.language,
      projectName: config.projectName,
      baseUrl: config.baseUrl,
      description: config.description,
    });

    setRegenNodeId(null);

    if (!result.success) {
      setError(`Regeneration failed: ${result.error}`);
      return;
    }

    setTree(prev => updateById(prev, node.id, () => ({ content: result.content })));
    if (selectedNode?.id === node.id) {
      setEditContent(result.content);
    }
  }, [apiKey, config, selectedNode]);

  /* ── ZIP download ───────────────────────────────────────── */
  const handleDownloadZip = useCallback(async () => {
    try {
      const zip  = new JSZip();
      const root = zip.folder(config.projectName || 'automation-framework');

      const addNodes = (folder, nodes) => {
        for (const n of nodes) {
          if (n.type === 'folder') {
            addNodes(folder.folder(n.name), n.children || []);
          } else {
            folder.file(n.name, n.content || '');
          }
        }
      };

      addNodes(root, tree);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${config.projectName || 'automation-framework'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ZIP download failed: ${err.message}`);
    }
  }, [tree, config.projectName]);

  /* ── Clipboard ──────────────────────────────────────────── */
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  /* ── Download single file ───────────────────────────────── */
  const downloadFile = useCallback((name, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ── Tree node renderer (recursive) ────────────────────── */
  const renderTreeNode = (node, depth) => {
    const isSelected = selectedNode?.id === node.id;
    const isEditing  = editingId === node.id;
    const isRegen    = regenNodeId === node.id;
    const indent     = { paddingLeft: depth * 14 + 8 };

    if (node.type === 'folder') {
      return (
        <div key={node.id} className="ff-folder-block">
          <div
            className={`ff-tree-node ff-folder-node ${node.expanded ? 'expanded' : ''}`}
            style={indent}
            onClick={() => toggleFolder(node.id)}
          >
            <span className="ff-tree-arrow">{node.expanded ? '▾' : '▸'}</span>
            <span className="ff-tree-icon">📁</span>
            {isEditing ? (
              <input
                className="ff-rename-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(node); if (e.key === 'Escape') setEditingId(null); }}
                onBlur={() => commitRename(node)}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="ff-tree-name">{node.name}</span>
            )}
            <div className="ff-node-actions" onClick={e => e.stopPropagation()}>
              <button onClick={() => startAdd(node.id, 'file')} title="Add file">📄+</button>
              <button onClick={() => startAdd(node.id, 'folder')} title="Add folder">📁+</button>
              <button onClick={() => startRename(node)} title="Rename">✏️</button>
              <button onClick={() => handleDelete(node.id)} title="Delete">🗑️</button>
            </div>
          </div>
          {node.expanded && (
            <div className="ff-tree-children">
              {(node.children || []).map(child => renderTreeNode(child, depth + 1))}
              {addingTo?.parentId === node.id && renderAddInput()}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={`ff-tree-node ff-file-node ${isSelected ? 'selected' : ''} ${isRegen ? 'regen' : ''}`}
        style={indent}
        onClick={() => handleFileSelect(node)}
      >
        <span className="ff-tree-icon">{fileIcon(node.name)}</span>
        {isEditing ? (
          <input
            className="ff-rename-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(node); if (e.key === 'Escape') setEditingId(null); }}
            onBlur={() => commitRename(node)}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="ff-tree-name">{node.name}</span>
        )}
        {isRegen && <span className="ff-regen-spin">⟳</span>}
        <div className="ff-node-actions" onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); handleRegenerateFile(node); }} title="Regenerate">♻️</button>
          <button onClick={e => { e.stopPropagation(); startRename(node); }} title="Rename">✏️</button>
          <button onClick={e => { e.stopPropagation(); handleDelete(node.id); }} title="Delete">🗑️</button>
        </div>
      </div>
    );
  };

  /* ── Inline add input ───────────────────────────────────── */
  const renderAddInput = () => (
    <div className="ff-add-input-row">
      <span>{addingTo?.type === 'folder' ? '📁' : '📄'}</span>
      <input
        className="ff-add-input"
        value={newItemName}
        onChange={e => setNewItemName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commitAdd();
          if (e.key === 'Escape') { setAddingTo(null); setNewItemName(''); }
        }}
        onBlur={() => { if (newItemName.trim()) commitAdd(); else { setAddingTo(null); setNewItemName(''); } }}
        placeholder={addingTo?.type === 'folder' ? 'folder-name' : 'filename.ts'}
        autoFocus
      />
    </div>
  );

  /* ── Config form ────────────────────────────────────────── */
  const fw = FRAMEWORK_CONFIGS[config.framework] || FRAMEWORK_CONFIGS['playwright-e2e'];

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="ff-panel">

      {/* Header */}
      <div className="ff-header">
        <div className="ff-header-left">
          <span className="ff-header-icon">🏗️</span>
          <div>
            <h2 className="ff-header-title">Framework Forge</h2>
            <p className="ff-header-sub">Generate a complete automation framework from your tech stack</p>
          </div>
        </div>
        {tree.length > 0 && !loading && (
          <div className="ff-header-right">
            <span className="ff-stat-chip">{countFiles(tree)} files</span>
            {modelUsed && (
              <span className="ff-model-chip">{modelUsed.replace('llama-', 'llama ').replace('-versatile', '')}</span>
            )}
            <button className="ff-zip-btn" onClick={handleDownloadZip}>
              ⬇ Download ZIP
            </button>
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="ff-error-bar">
          <span>⚠️ {error}</span>
          <div className="ff-error-actions">
            {isRateLimit && (
              <button className="ff-retry-btn" onClick={handleGenerate} disabled={loading}>
                ↺ Try Again
              </button>
            )}
            <button className="ff-error-close" onClick={() => { setError(''); setIsRateLimit(false); }}>✕</button>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className={`ff-workspace ${tree.length > 0 || loading ? 'ff-workspace-split' : ''}`}>

        {/* Left col: config form */}
        <div className="ff-col-config">
          <div className="ff-config-section">
            <div className="ff-section-label">Framework</div>
            <div className="ff-fw-grid">
              {Object.values(FRAMEWORK_CONFIGS).map(f => (
                <button
                  key={f.id}
                  className={`ff-fw-btn ${config.framework === f.id ? 'selected' : ''}`}
                  style={{ '--fw-clr': f.color }}
                  onClick={() => handleFrameworkChange(f.id)}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ff-config-section">
            <div className="ff-section-label">Language</div>
            <div className="ff-lang-row">
              {fw.languages.map(lang => (
                <button
                  key={lang}
                  className={`ff-lang-btn ${config.language === lang ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, language: lang }))}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="ff-config-section">
            <div className="ff-section-label">Project Name</div>
            <input
              className="ff-input"
              value={config.projectName}
              onChange={e => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
              placeholder="my-automation-framework"
            />
          </div>

          <div className="ff-config-section">
            <div className="ff-section-label">Application URL</div>
            <input
              className="ff-input"
              value={config.baseUrl}
              onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://app.example.com"
            />
          </div>

          <div className="ff-config-section">
            <div className="ff-section-label">What to test <span className="ff-opt-tag">optional</span></div>
            <textarea
              className="ff-textarea"
              rows={3}
              value={config.description}
              onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Login, checkout, and user profile E2E scenarios"
            />
          </div>

          <div className="ff-config-section">
            <div className="ff-section-label">Options</div>
            <div className="ff-options-grid">
              {[
                { key: 'linting',  label: 'Linting' },
                { key: 'prettier', label: 'Prettier' },
                { key: 'docker',   label: 'Docker' },
                { key: 'allure',   label: 'Allure Reports' },
              ].map(opt => (
                <label key={opt.key} className="ff-checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.options[opt.key]}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, [opt.key]: e.target.checked },
                    }))}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="ff-generate-btn"
            onClick={handleGenerate}
            disabled={loading}
            style={{ '--fw-clr': fw.color }}
          >
            {loading ? '⟳ Generating…' : `🏗️ Generate Framework`}
          </button>
        </div>

        {/* Loading: BLAST tracker */}
        {loading && (
          <div className="ff-col-blast">
            <div className="ff-blast-wrap">
              <div className="ff-blast-spinner" style={{ '--fw-clr': fw.color }}></div>
              <div className="ff-blast-header">
                <span className="ff-blast-fw-icon">{fw.icon}</span>
                <div>
                  <div className="ff-blast-fw-name">{fw.label} · {config.language}</div>
                  <div className="ff-blast-proj">{config.projectName}</div>
                </div>
              </div>
              <div className="ff-blast-phases">
                {BLAST_PHASES.map((phase, i) => (
                  <div
                    key={phase.letter}
                    className={`ff-blast-phase ${i < blastPhase ? 'done' : i === blastPhase ? 'active' : 'pending'}`}
                  >
                    <div className="ff-blast-dot" style={{ '--fw-clr': fw.color }}>
                      {i < blastPhase ? '✓' : phase.letter}
                    </div>
                    <div className="ff-blast-text">
                      <span className="ff-blast-phase-label">{phase.label}</span>
                      {i === blastPhase && (
                        <span className="ff-blast-desc">{phase.desc}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tree column */}
        {!loading && tree.length > 0 && (
          <div className="ff-col-tree">
            <div className="ff-tree-top">
              <div className="ff-tree-heading">
                <span>📂 {config.projectName}</span>
              </div>
              <div className="ff-tree-top-actions">
                <button className="ff-tree-top-btn" onClick={() => startAdd(null, 'file')} title="Add file">📄</button>
                <button className="ff-tree-top-btn" onClick={() => startAdd(null, 'folder')} title="Add folder">📁</button>
              </div>
            </div>
            <div className="ff-tree-body">
              {tree.map(node => renderTreeNode(node, 0))}
              {addingTo && !addingTo.parentId && renderAddInput()}
            </div>
          </div>
        )}

        {/* Code viewer column */}
        {!loading && tree.length > 0 && (
          <div className="ff-col-viewer">
            {selectedNode ? (
              <div className="ff-viewer">
                <div className="ff-viewer-toolbar">
                  <div className="ff-viewer-file">
                    <span>{fileIcon(selectedNode.name)}</span>
                    <span className="ff-viewer-fname">{selectedNode.name}</span>
                    <span className="ff-viewer-lang-dot" data-lang={selectedNode.lang}></span>
                    <span className="ff-viewer-lang-txt">{selectedNode.lang}</span>
                  </div>
                  <div className="ff-viewer-btns">
                    {regenNodeId === selectedNode.id && (
                      <span className="ff-regen-spin-sm">⟳</span>
                    )}
                    <button
                      className="ff-viewer-btn"
                      onClick={() => handleRegenerateFile(selectedNode)}
                      disabled={regenNodeId !== null}
                      title="Regenerate this file with AI"
                    >
                      ♻️ Regen
                    </button>
                    <button className="ff-viewer-btn" onClick={() => copyToClipboard(editContent)}>
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button
                      className="ff-viewer-btn"
                      onClick={() => downloadFile(selectedNode.name, editContent)}
                    >
                      ⬇ Save
                    </button>
                  </div>
                </div>
                <textarea
                  className="ff-code-area"
                  value={editContent}
                  onChange={e => handleContentChange(e.target.value)}
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="ff-viewer-empty">
                <span className="ff-viewer-empty-icon">👈</span>
                <p>Select a file from the tree to view and edit its content</p>
              </div>
            )}
          </div>
        )}

        {/* Welcome state (no tree yet) */}
        {!loading && tree.length === 0 && (
          <div className="ff-col-welcome">
            <div className="ff-welcome">
              <div className="ff-welcome-icon">🏗️</div>
              <h3>Choose your framework</h3>
              <p>Select a framework on the left, fill in your project details, and click <strong>Generate Framework</strong> to scaffold a complete, production-ready automation project.</p>
              <div className="ff-welcome-features">
                <div className="ff-welcome-feat"><span>📂</span><span>Interactive file tree</span></div>
                <div className="ff-welcome-feat"><span>✏️</span><span>Edit any file in-browser</span></div>
                <div className="ff-welcome-feat"><span>♻️</span><span>Regenerate individual files</span></div>
                <div className="ff-welcome-feat"><span>⬇</span><span>Download full ZIP</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
