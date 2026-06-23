import React, { useState } from 'react';

/* ── Colour maps ─────────────────────────────────────── */
const PRIORITY_COLORS = {
  Critical: '#dc2626', High: '#f59e0b', Medium: '#3b82f6', Low: '#6b7280',
};
const TYPE_COLORS = {
  Functional:'#22c55e', Negative:'#ef4444', Boundary:'#f59e0b',
  Integration:'#6366f1', Security:'#8b5cf6', Performance:'#3b82f6',
  Accessibility:'#06b6d4', Regression:'#64748b', Smoke:'#f97316',
  UAT:'#ec4899', Exploratory:'#0ea5e9',
};

/*
 * Column definitions  — WIDTHS ARE APPLIED INLINE ON EVERY th AND td
 * so we never rely on table-layout:fixed cascade.
 * Total = 55+150+240+170+150+180+130+120+55 = 1250px
 */
const COLS = [
  { key: 'srno',     label: '#',               w: 55,  align: 'center' },
  { key: 'id',       label: 'Test ID',          w: 150, align: 'left'   },
  { key: 'cases',    label: 'Test Cases',       w: 240, align: 'left'   },
  { key: 'scenario', label: 'Test Scenarios',   w: 170, align: 'left'   },
  { key: 'data',     label: 'Test Data',        w: 150, align: 'left'   },
  { key: 'expected', label: 'Expected Result',  w: 180, align: 'left'   },
  { key: 'actual',   label: 'Actual Result',    w: 130, align: 'left'   },
  { key: 'remark',   label: 'Remark',           w: 120, align: 'left'   },
  { key: 'action',   label: 'Actions',          w: 90,  align: 'center' },
];
const TOTAL_W = COLS.reduce((s, c) => s + c.w, 0); // 1250px
const TOTAL_COLS = COLS.length;                      // 9

/* inline style helpers — applied on EVERY th and td to guarantee widths */
const thStyle = (col) => ({
  width: col.w,
  minWidth: col.w,
  maxWidth: col.w,
  textAlign: col.align,
  overflow: 'hidden',
  boxSizing: 'border-box',
});

const tdStyle = (col) => ({
  width: col.w,
  minWidth: col.w,
  maxWidth: col.w,
  textAlign: col.align,
  verticalAlign: 'top',
  overflow: 'hidden',
  boxSizing: 'border-box',
  padding: '10px',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'normal',
});

/* ── Type badge ──────────────────────────────────────── */
function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 8px',
        borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
        background: color + '1a', color, border: `1px solid ${color}40`,
        whiteSpace: 'nowrap', marginBottom: 5,
      }}
    >
      {type || 'Functional'}
    </span>
  );
}

/* ── Expanded detail panel ───────────────────────────── */
function DetailPanel({ tc }) {
  const priColor = PRIORITY_COLORS[tc.priority] || '#6b7280';
  const steps = (tc.testSteps || '').split('\n').filter(Boolean);

  return (
    <div className="tc-detail-panel">
      <div className="tc-detail-badges">
        <span className="tc-meta-badge" style={{ background: priColor + '22', color: priColor }}>
          {tc.priority} Priority
        </span>
        <span className="tc-meta-badge tc-exec-badge">
          {tc.executionType === 'Automated' ? '🤖' : '👤'} {tc.executionType || 'Manual'}
        </span>
        {tc.severity && <span className="tc-meta-badge">{tc.severity}</span>}
        {tc.linkedStoryKey && (
          <span className="tc-meta-badge tc-linked-badge">🔗 {tc.linkedStoryKey}</span>
        )}
      </div>

      <div className="tc-detail-grid">
        {steps.length > 0 && (
          <div className="tc-detail-block full">
            <span className="tc-detail-label">Test Steps</span>
            <ol className="tc-detail-steps">
              {steps.map((s, i) => (
                <li key={i}>{s.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>
        )}
        {tc.preconditions && (
          <div className="tc-detail-block full">
            <span className="tc-detail-label">Preconditions</span>
            <span className="tc-detail-value">{tc.preconditions}</span>
          </div>
        )}
        <div className="tc-detail-block">
          <span className="tc-detail-label">Component</span>
          <span className="tc-detail-value">{tc.component || '—'}</span>
        </div>
        <div className="tc-detail-block">
          <span className="tc-detail-label">Labels</span>
          <span className="tc-detail-value">{tc.labels || '—'}</span>
        </div>
        <div className="tc-detail-block">
          <span className="tc-detail-label">Sprint</span>
          <span className="tc-detail-value">{tc.sprint || '—'}</span>
        </div>
        <div className="tc-detail-block">
          <span className="tc-detail-label">Environment</span>
          <span className="tc-detail-value">{tc.testEnvironment || '—'}</span>
        </div>
        <div className="tc-detail-block">
          <span className="tc-detail-label">Assignee</span>
          <span className="tc-detail-value">{tc.assignee || '—'}</span>
        </div>
        <div className="tc-detail-block">
          <span className="tc-detail-label">Reporter</span>
          <span className="tc-detail-value">{tc.reporter || '—'}</span>
        </div>
        {tc.defectId && (
          <div className="tc-detail-block">
            <span className="tc-detail-label">Defect ID</span>
            <span className="tc-defect-chip">{tc.defectId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main table ──────────────────────────────────────── */
export default function TestCaseTable({ testCases, selected, onToggleSelect, onToggleAll, onEdit, onCreateDefect }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [sortField,   setSortField]   = useState('testCaseId');
  const [sortDir,     setSortDir]     = useState('asc');

  const toggleExpand = (id) =>
    setExpandedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...testCases].sort((a, b) => {
    const va = (a[sortField] || '').toString().toLowerCase();
    const vb = (b[sortField] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const allSelected = testCases.length > 0 && selected.size === testCases.length;

  const SortIcon = ({ field }) => (
    sortField === field
      ? <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="sort-icon">↕</span>
  );

  return (
    /* Outer scroll wrapper — display:block so width:100% means container width */
    <div style={{ display: 'block', width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                  borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <table style={{ width: TOTAL_W, minWidth: TOTAL_W, borderCollapse: 'collapse',
                      tableLayout: 'fixed', fontSize: '0.81rem' }}>

        {/* colgroup as additional safety net */}
        <colgroup>
          {COLS.map((col) => (
            <col key={col.key} style={{ width: col.w, minWidth: col.w }} />
          ))}
        </colgroup>

        {/* ── HEADER ── */}
        <thead>
          <tr>
            {/* Sr.No */}
            <th style={{ ...thStyle(COLS[0]),
                         background: 'linear-gradient(180deg,#1e293b 0%,#0f172a 100%)',
                         color: '#e2e8f0', padding: '11px 8px',
                         fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                         letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
                <span>#</span>
              </div>
            </th>

            {COLS.slice(1, -1).map((col, ci) => {
              const sortKeys = ['testCaseId','summary','testType','testData','expectedResult','actualResult','comments'];
              const sk = sortKeys[ci];
              return (
                <th
                  key={col.key}
                  onClick={sk ? () => handleSort(sk) : undefined}
                  style={{ ...thStyle(col),
                           background: 'linear-gradient(180deg,#1e293b 0%,#0f172a 100%)',
                           color: '#e2e8f0', padding: '11px 10px',
                           fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                           letterSpacing: '0.05em', cursor: sk ? 'pointer' : 'default',
                           position: 'sticky', top: 0, zIndex: 2,
                           borderRight: '1px solid rgba(255,255,255,0.06)',
                           whiteSpace: 'nowrap' }}
                >
                  {col.label}
                  {sk && <SortIcon field={sk} />}
                </th>
              );
            })}

            {/* Action */}
            <th style={{ ...thStyle(COLS[8]),
                         background: 'linear-gradient(180deg,#1e293b 0%,#0f172a 100%)',
                         color: '#e2e8f0', padding: '11px 8px',
                         fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                         letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 2 }}>
              Action
            </th>
          </tr>
        </thead>

        {/* ── BODY ── */}
        <tbody>
          {sorted.map((tc, idx) => {
            const isExpanded = expandedIds.has(tc.testCaseId);
            const isSelected = selected.has(tc.testCaseId);
            const priColor   = PRIORITY_COLORS[tc.priority] || '#6b7280';
            const rowBg      = isSelected ? '#eef2ff' : idx % 2 === 1 ? '#fafbfc' : '#ffffff';

            return (
              <React.Fragment key={tc.testCaseId}>
                <tr style={{ background: rowBg }}>

                  {/* Sr.No */}
                  <td style={{ ...tdStyle(COLS[0]), borderLeft: `3px solid ${priColor}`,
                               borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <input type="checkbox" checked={isSelected}
                             onChange={() => onToggleSelect(tc.testCaseId)} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</span>
                    </div>
                  </td>

                  {/* Test ID */}
                  <td style={{ ...tdStyle(COLS[1]), borderBottom: '1px solid #f1f5f9' }}>
                    <code style={{ display: 'block', fontFamily: "'SF Mono','Fira Code',monospace",
                                   fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5',
                                   marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden',
                                   textOverflow: 'ellipsis', background: 'none', padding: 0,
                                   borderRadius: 0 }}>
                      {tc.testCaseId}
                    </code>
                    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 10,
                                   fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase',
                                   letterSpacing: '0.04em', whiteSpace: 'nowrap',
                                   background: priColor + '1a', color: priColor }}>
                      {tc.priority}
                    </span>
                  </td>

                  {/* Test Cases */}
                  <td style={{ ...tdStyle(COLS[2]), borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => toggleExpand(tc.testCaseId)}
                        title="Expand steps"
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                                 width: 20, height: 20, flexShrink: 0, marginTop: 2,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 borderRadius: 4, color: '#94a3b8', padding: 0 }}
                      >
                        <span style={{ fontSize: '0.75rem',
                                       display: 'inline-block',
                                       transform: isExpanded ? 'rotate(90deg)' : 'none',
                                       transition: 'transform 0.2s' }}>▸</span>
                      </button>
                      <p style={{ margin: 0, fontSize: '0.81rem', fontWeight: 600, color: '#1e293b',
                                  lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word',
                                  flex: 1, minWidth: 0 }}>
                        {tc.summary}
                      </p>
                    </div>
                  </td>

                  {/* Test Scenarios */}
                  <td style={{ ...tdStyle(COLS[3]), borderBottom: '1px solid #f1f5f9' }}>
                    <TypeBadge type={tc.testType} />
                    {tc.preconditions && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#475569',
                                  lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {tc.preconditions}
                      </p>
                    )}
                  </td>

                  {/* Test Data */}
                  <td style={{ ...tdStyle(COLS[4]), borderBottom: '1px solid #f1f5f9' }}>
                    {tc.testData
                      ? <div style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#1e293b',
                                      padding: '4px 8px', borderRadius: 4, lineHeight: 1.5,
                                      wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {tc.testData}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* Expected Result */}
                  <td style={{ ...tdStyle(COLS[5]), borderBottom: '1px solid #f1f5f9' }}>
                    {tc.expectedResult
                      ? <div style={{ margin: 0, fontSize: '0.78rem', color: '#15803d',
                                      borderLeft: '3px solid #22c55e', padding: '3px 8px',
                                      lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {tc.expectedResult}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* Actual Result */}
                  <td style={{ ...tdStyle(COLS[6]), borderBottom: '1px solid #f1f5f9' }}>
                    {tc.actualResult
                      ? <div style={{ margin: 0, fontSize: '0.78rem', color: '#374151',
                                      lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {tc.actualResult}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* Remark */}
                  <td style={{ ...tdStyle(COLS[7]), borderBottom: '1px solid #f1f5f9' }}>
                    {tc.comments
                      ? <div style={{ margin: 0, fontSize: '0.78rem', color: '#64748b',
                                      lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {tc.comments}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ ...tdStyle(COLS[8]), borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button
                        onClick={() => onEdit(tc)}
                        title="Edit test case"
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                                 fontSize: '0.85rem', padding: '4px 5px', borderRadius: 5 }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onCreateDefect(tc)}
                        title={tc.status === 'Fail' ? 'Create defect ticket' : 'Create defect (test case status: ' + (tc.status || 'Not Executed') + ')'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '4px 5px', borderRadius: 5,
                          opacity: tc.status === 'Fail' ? 1 : 0.4,
                          filter: tc.status === 'Fail' ? 'none' : 'grayscale(60%)',
                        }}
                      >
                        🐛
                      </button>
                    </div>
                    {tc.defectId && (
                      <a
                        href={tc.defectUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Defect: ${tc.defectId}`}
                        style={{
                          display: 'block', marginTop: 3, fontSize: '0.65rem', fontWeight: 700,
                          color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca',
                          borderRadius: 4, padding: '1px 5px', textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {tc.defectId}
                      </a>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={TOTAL_COLS} style={{ padding: 0, borderBottom: '2px solid #4f46e5' }}>
                      <DetailPanel tc={tc} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
