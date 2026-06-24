import React, { useState, useMemo } from 'react';
import { useHistory, HISTORY_TYPES } from '../../context/HistoryContext';
import './HistoryPanel.css';

const TAB_ID_TO_LABEL = Object.fromEntries(
  Object.entries(HISTORY_TYPES).map(([id, { label }]) => [id, label])
);

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr  = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;
  if (diffDay < 7)  return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPreview(item) {
  const d = item.data;
  switch (item.type) {
    case 'qabuddy': {
      const msgs = d.messages || [];
      const first = msgs.find(m => m.role === 'user');
      return first ? first.content : '';
    }
    case 'generation':  return d.requirements?.slice(0, 120) || d.productName || '';
    case 'testcases':   return d.requirements?.slice(0, 120) || d.issueKey || '';
    case 'strategy':    return d.requirements?.slice(0, 120) || d.productName || '';
    case 'metrics':     return `${d.projectName || ''} — ${d.inputs?.totalTestCases || 0} test cases`;
    case 'defect':      return d.result?.title || d.appName || '';
    case 'apiforge':    return d.specText?.slice(0, 120) || d.baseUrl || '';
    case 'codegen':     return d.flow?.slice(0, 120) || `${d.framework} · ${d.language}`;
    case 'framework':   return `${d.config?.framework || ''} · ${d.config?.language || ''}`;
    default: return '';
  }
}

function buildViewContent(item) {
  const d = item.data;
  switch (item.type) {
    case 'qabuddy':
      return (d.messages || [])
        .map(m => `[${m.role.toUpperCase()}]\n${m.content}`)
        .join('\n\n─────────────────────\n\n');
    case 'generation':
      return JSON.stringify(d.testPlan || d, null, 2);
    case 'testcases':
      return JSON.stringify(d.testCases || d, null, 2);
    case 'strategy':
      return typeof d.strategy === 'string' ? d.strategy : JSON.stringify(d.strategy || d, null, 2);
    case 'metrics':
      return JSON.stringify(d, null, 2);
    case 'defect':
      return JSON.stringify(d.result || d, null, 2);
    case 'apiforge':
      return JSON.stringify(d.result || d, null, 2);
    case 'codegen':
      return (d.result?.files || []).map(f => `// ── ${f.name} ──\n${f.content}`).join('\n\n') || JSON.stringify(d, null, 2);
    case 'framework':
      return (d.tree || []).map(n => `${n.path}\n${n.content || ''}`).join('\n\n─────\n\n');
    default:
      return JSON.stringify(d, null, 2);
  }
}

/* ── View Modal ─────────────────────────────────────────── */
function ViewModal({ item, onClose }) {
  const content = buildViewContent(item);
  const typeInfo = HISTORY_TYPES[item.type] || {};
  return (
    <div className="hist-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hist-modal">
        <div className="hist-modal-header">
          <span className="hist-modal-title">{typeInfo.icon} {item.title}</span>
          <button className="hist-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="hist-modal-body">
          <pre className="hist-modal-pre">{content}</pre>
        </div>
      </div>
    </div>
  );
}

/* ── History Item Card ─────────────────────────────────── */
function HistoryItemCard({ item, onView, onResume, onDelete }) {
  const typeInfo = HISTORY_TYPES[item.type] || { icon: '📄', label: item.type };
  const preview  = getPreview(item);
  return (
    <div className="history-item">
      <div className="history-item-header">
        <span className="history-item-icon">{typeInfo.icon}</span>
        <div className="history-item-meta">
          <div className="history-item-type">{typeInfo.label}</div>
          <div className="history-item-title">{item.title}</div>
          <div className="history-item-date">{formatDate(item.savedAt)}</div>
        </div>
      </div>
      {preview && <div className="history-item-preview">{preview}</div>}
      <div className="history-item-actions">
        <button className="hist-btn" onClick={() => onView(item)}>👁 View</button>
        <button className="hist-btn resume" onClick={() => onResume(item)}>▶ Resume</button>
        <button className="hist-btn delete" onClick={() => onDelete(item.id)}>🗑</button>
      </div>
    </div>
  );
}

/* ── Main Panel ────────────────────────────────────────── */
export default function HistoryPanel({ onResume }) {
  const { items, deleteItem, clearAll } = useHistory();
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch]         = useState('');
  const [viewItem, setViewItem]     = useState(null);

  const filtered = useMemo(() => {
    let list = items;
    if (filterType !== 'all') list = list.filter(i => i.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) || getPreview(i).toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filterType, search]);

  const typeOptions = useMemo(() => {
    const seen = new Set(items.map(i => i.type));
    return Object.entries(HISTORY_TYPES).filter(([id]) => seen.has(id));
  }, [items]);

  const handleClearAll = () => {
    if (window.confirm('Clear all history? This cannot be undone.')) clearAll();
  };

  return (
    <div className="history-panel">
      {/* Header */}
      <div className="history-header">
        <span className="history-title">📚 History</span>
        {items.length > 0 && (
          <button className="history-clear-btn" onClick={handleClearAll}>Clear All</button>
        )}
      </div>

      {items.length > 0 && (
        <>
          {/* Search */}
          <div className="history-search-wrap">
            <span className="history-search-icon">🔍</span>
            <input
              className="history-search"
              placeholder="Search saved items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className="history-filters">
            <button
              className={`history-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({items.length})
            </button>
            {typeOptions.map(([id, { icon, label }]) => {
              const count = items.filter(i => i.type === id).length;
              return (
                <button
                  key={id}
                  className={`history-filter-btn ${filterType === id ? 'active' : ''}`}
                  onClick={() => setFilterType(id)}
                >
                  {icon} {label} ({count})
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Items */}
      <div className="history-list">
        {filtered.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">📭</div>
            <div className="history-empty-text">
              {items.length === 0 ? 'No saved items yet' : 'No results found'}
            </div>
            <div className="history-empty-hint">
              {items.length === 0
                ? 'Click 💾 Save in any generator to save your work here'
                : 'Try a different search or filter'}
            </div>
          </div>
        ) : (
          filtered.map(item => (
            <HistoryItemCard
              key={item.id}
              item={item}
              onView={setViewItem}
              onResume={onResume}
              onDelete={deleteItem}
            />
          ))
        )}
      </div>

      {/* View modal */}
      {viewItem && <ViewModal item={viewItem} onClose={() => setViewItem(null)} />}
    </div>
  );
}
