/**
 * TestMetricsGenerator.jsx
 * B.L.A.S.T. Framework — RICE-POT Test Metrics Calculator & Report Generator
 *
 * Based on testmetrics_template.md
 * 14 raw inputs → 20 calculated metrics + RICE-POT interpretation
 * Export: Markdown · CSV · Excel · HTML (PDF-printable)
 */

import React, { useState, useMemo } from 'react';
import {
  exportToMarkdown,
  exportToCSV,
  exportToExcel,
  exportToHTML,
} from '../../services/testMetricsExporter';
import '../styles/TestMetrics.css';

/* ── Input field definitions ───────────────────────────── */
const INPUT_GROUPS = [
  {
    title: 'Requirements & Test Cases',
    icon: '📋',
    fields: [
      { key: 'requirements',   label: 'No. of Requirements',        hint: 'Count of Story/Epic issues in scope', source: 'JQL: issuetype in (Story, Epic) AND fixVersion = X' },
      { key: 'totalTestCases', label: 'Total No. of Test Cases',    hint: 'Test issues linked to requirements', source: 'Xray Test Repository / Zephyr Test Case count' },
    ],
  },
  {
    title: 'Test Execution',
    icon: '▶️',
    fields: [
      { key: 'executed',    label: 'Test Cases Executed',    hint: 'Tests with any status other than "Not Executed"', source: 'Xray Test Execution report / Zephyr Test Cycle' },
      { key: 'passed',      label: 'Test Cases Passed',      hint: 'Tests with Status = Pass',    source: 'Test Execution report' },
      { key: 'failed',      label: 'Test Cases Failed',      hint: 'Tests with Status = Fail',    source: 'Test Execution report' },
      { key: 'blocked',     label: 'Test Cases Blocked',     hint: 'Tests with Status = Blocked', source: 'Test Execution report' },
      { key: 'unexecuted',  label: 'Test Cases Unexecuted',  hint: 'Tests with Status = Not Executed (or Total − Executed)', source: 'Test Execution report' },
    ],
  },
  {
    title: 'Defects by Severity',
    icon: '🐛',
    fields: [
      { key: 'totalDefects',    label: 'Total Defects Identified', hint: 'All Bug issues linked to the release', source: 'JQL: issuetype = Bug AND fixVersion = X' },
      { key: 'critical',        label: 'Critical Defects',         hint: 'Priority/Severity = Critical', source: 'Same Bug filter, grouped by Priority' },
      { key: 'high',            label: 'High Defects',             hint: 'Priority/Severity = High',     source: 'Same Bug filter, grouped by Priority' },
      { key: 'medium',          label: 'Medium Defects',           hint: 'Priority/Severity = Medium',   source: 'Same Bug filter, grouped by Priority' },
      { key: 'low',             label: 'Low Defects',              hint: 'Priority/Severity = Low',      source: 'Same Bug filter, grouped by Priority' },
    ],
  },
  {
    title: 'Special Defect Categories',
    icon: '🔍',
    fields: [
      { key: 'customerDefects', label: 'Customer Defects',  hint: 'Bugs labeled as customer-reported', source: 'Label = "Customer-reported" or linked support ticket' },
      { key: 'uatDefects',      label: 'Defects in UAT',    hint: 'Bugs raised during UAT Test Execution', source: 'Filter by Test Phase = UAT or UAT-specific Execution key' },
    ],
  },
];

/* ── Calculation engine ────────────────────────────────── */
function calculate(inputs, assumptions, exitCriteria) {
  const n = v => parseFloat(v) || 0;

  const req     = n(inputs.requirements);
  const total   = n(inputs.totalTestCases);
  const exec    = n(inputs.executed);
  const passed  = n(inputs.passed);
  const failed  = n(inputs.failed);
  const blocked = n(inputs.blocked);
  const unexec  = n(inputs.unexecuted);
  const totalDef = n(inputs.totalDefects);
  const critical = n(inputs.critical);
  const high     = n(inputs.high);
  const medium   = n(inputs.medium);
  const low      = n(inputs.low);
  const custDef  = n(inputs.customerDefects);
  const uatDef   = n(inputs.uatDefects);

  // Reconciliation checks
  const check1Attempted = total > 0 && (passed + failed + blocked + unexec) > 0;
  const check1 = check1Attempted && (passed + failed + blocked + unexec === total);

  const check2Attempted = totalDef > 0 && (critical + high + medium + low) > 0;
  const check2 = check2Attempted && (critical + high + medium + low === totalDef);

  // Calculated metrics
  const fmt = v => v.toFixed(1);
  const avgTCsPerReq   = req > 0   ? fmt(total / req)   : 'N/A';
  const pctExecuted    = total > 0  ? fmt((exec / total) * 100)    : 'N/A';
  const pctNotExecuted = total > 0  ? fmt((unexec / total) * 100)  : 'N/A';
  const pctPassed      = exec > 0   ? fmt((passed / exec) * 100)   : 'N/A';
  const pctFailed      = exec > 0   ? fmt((failed / exec) * 100)   : 'N/A';
  const pctBlocked     = exec > 0   ? fmt((blocked / exec) * 100)  : 'N/A';

  // RICE-POT assessment
  const passNum  = pctPassed !== 'N/A' ? parseFloat(pctPassed) : null;
  const blkNum   = pctBlocked !== 'N/A' ? parseFloat(pctBlocked) : null;
  const avgNum   = avgTCsPerReq !== 'N/A' ? parseFloat(avgTCsPerReq) : null;
  const critMet  = passNum !== null && passNum >= exitCriteria.minPassRate && critical <= exitCriteria.maxCriticalDefects;

  const ricepot = {
    R: { flag: critical > 0 || custDef > 0 || uatDef > 0,
         text: (() => {
           const flags = [];
           if (critical > 0) flags.push(`${critical} Critical defect(s) open`);
           if (custDef  > 0) flags.push(`${custDef} Customer defect(s)`);
           if (uatDef   > 0) flags.push(`${uatDef} UAT defect(s)`);
           return flags.length ? `FLAGGED — ${flags.join('; ')}. Resolve all Critical defects before release.`
                                : 'No risk flags — no Critical, Customer, or UAT defects reported.';
         })() },
    I: { flag: avgNum !== null && avgNum < 2,
         text: avgNum === null ? 'Cannot assess — provide requirements and test case counts.'
              : avgNum < 2    ? `FLAGGED — avg ${avgTCsPerReq} TCs/requirement is below the 2.0 threshold; possible under-coverage.`
                              : `No flag — avg ${avgTCsPerReq} TCs/requirement indicates adequate coverage.` },
    C: { flag: !critMet,
         text: passNum === null ? 'Cannot assess — pass rate not calculable.'
              : critMet        ? `MET — pass rate ${pctPassed}% ≥ ${exitCriteria.minPassRate}% and Critical defects ≤ ${exitCriteria.maxCriticalDefects}.`
                               : `NOT MET — ${passNum < exitCriteria.minPassRate ? `pass rate ${pctPassed}% < ${exitCriteria.minPassRate}%` : ''}${passNum < exitCriteria.minPassRate && critical > exitCriteria.maxCriticalDefects ? '; ' : ''}${critical > exitCriteria.maxCriticalDefects ? `${critical} Critical defect(s) open` : ''}. Release blocked.` },
    E: { flag: uatDef > 0,
         text: uatDef > 0 ? `FLAGGED — ${uatDef} UAT defect(s) indicate environment/data gaps not caught in earlier phases.`
                          : 'No environment flag — zero UAT defects.' },
    P: { flag: blkNum !== null && blkNum > 5,
         text: blkNum === null    ? 'Cannot assess — blocked % not calculable.'
              : blkNum > 5        ? `FLAGGED — ${pctBlocked}% blocked > 5% threshold; investigate tester dependency or availability issues.`
                                  : `No people flag — ${pctBlocked}% blocked is within acceptable bounds.` },
    O: { flag: !critMet,
         text: critMet ? 'SUPPORTED — results support release-readiness; all exit criteria met.'
                       : 'NOT SUPPORTED — Critical defect resolution and/or re-execution of failed cases required before sign-off.' },
  };

  return {
    check1, check1Attempted, check2, check2Attempted,
    check1Detail: { sum: passed + failed + blocked + unexec, expected: total },
    check2Detail: { sum: critical + high + medium + low, expected: totalDef },
    avgTCsPerReq, pctExecuted, pctNotExecuted, pctPassed, pctFailed, pctBlocked,
    critMet, ricepot,
    raw: { req, total, exec, passed, failed, blocked, unexec, totalDef, critical, high, medium, low, custDef, uatDef },
  };
}

/* ── Recon check indicator ─────────────────────────────── */
function CheckPill({ ok, attempted, label, detail }) {
  if (!attempted) return (
    <div className="tm-check na">
      <span className="tm-check-icon">—</span>
      <div><div className="tm-check-label">{label}</div><div className="tm-check-detail">Fill inputs to validate</div></div>
    </div>
  );
  return (
    <div className={`tm-check ${ok ? 'pass' : 'fail'}`}>
      <span className="tm-check-icon">{ok ? '✓' : '✗'}</span>
      <div>
        <div className="tm-check-label">{label}</div>
        {!ok && detail && <div className="tm-check-detail">{detail}</div>}
      </div>
    </div>
  );
}

/* ── RICE-POT row ──────────────────────────────────────── */
const RICEPOT_LABELS = {
  R: { label: 'Risks',       color: '#ef4444' },
  I: { label: 'Items',       color: '#f59e0b' },
  C: { label: 'Criteria',    color: '#4f46e5' },
  E: { label: 'Environment', color: '#06b6d4' },
  P: { label: 'People',      color: '#8b5cf6' },
  O: { label: 'Objectives',  color: '#22c55e' },
};

function RicepotRow({ letter, data }) {
  const meta = RICEPOT_LABELS[letter];
  return (
    <div className={`tm-rp-row ${data.flag ? 'rp-flag' : 'rp-ok'}`}>
      <span className="tm-rp-letter" style={{ background: meta.color }}>{letter}</span>
      <div className="tm-rp-content">
        <span className="tm-rp-label">{meta.label}</span>
        <span className="tm-rp-text">{data.text}</span>
      </div>
      <span className={`tm-rp-badge ${data.flag ? 'badge-flag' : 'badge-ok'}`}>{data.flag ? 'FLAGGED' : 'OK'}</span>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
export default function TestMetricsGenerator() {
  const [projectName, setProjectName] = useState('');
  const [inputs, setInputs] = useState({
    requirements: '', totalTestCases: '', executed: '', passed: '',
    failed: '', blocked: '', unexecuted: '', totalDefects: '',
    critical: '', high: '', medium: '', low: '',
    customerDefects: '', uatDefects: '',
  });
  const [assumptions, setAssumptions] = useState({
    blockedIncludedInExecuted: true,
    customerDefectsAreSubset: true,
  });
  const [exitCriteria, setExitCriteria] = useState({
    minPassRate: 95,
    maxCriticalDefects: 0,
  });

  const calc = useMemo(() => calculate(inputs, assumptions, exitCriteria), [inputs, assumptions, exitCriteria]);

  const setInput = (key, val) => {
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return; // numbers only
    setInputs(prev => ({ ...prev, [key]: val }));
  };

  const pName = projectName.trim() || 'Release';

  const hasAnyInput = Object.values(inputs).some(v => v !== '');

  /* ── Metrics table rows for display ── */
  const METRIC_ROWS = [
    { label: 'No. of Requirements',              value: calc.raw.req    || '—', group: 'raw' },
    { label: 'Avg. No. of Test Cases / Req.',     value: calc.avgTCsPerReq,      group: 'calc' },
    { label: 'Total No. of Test Cases',           value: calc.raw.total  || '—', group: 'raw' },
    { label: 'Test Cases Executed',               value: calc.raw.exec   || '—', group: 'raw' },
    { label: 'Test Cases Passed',                 value: calc.raw.passed || '—', group: 'raw' },
    { label: 'Test Cases Failed',                 value: calc.raw.failed || '—', group: 'raw' },
    { label: 'Test Cases Blocked',                value: calc.raw.blocked|| '—', group: 'raw' },
    { label: 'Test Cases Unexecuted',             value: calc.raw.unexec || '—', group: 'raw' },
    { label: 'Total Defects Identified',          value: calc.raw.totalDef || '—', group: 'raw' },
    { label: 'Critical Defects',                  value: calc.raw.critical || '—', group: 'raw', severity: 'critical' },
    { label: 'High Defects',                      value: calc.raw.high     || '—', group: 'raw', severity: 'high' },
    { label: 'Medium Defects',                    value: calc.raw.medium   || '—', group: 'raw', severity: 'medium' },
    { label: 'Low Defects',                       value: calc.raw.low      || '—', group: 'raw', severity: 'low' },
    { label: 'Customer Defects',                  value: calc.raw.custDef  || '—', group: 'raw' },
    { label: 'Defects in UAT',                    value: calc.raw.uatDef   || '—', group: 'raw' },
    { label: '% Test Cases Executed',             value: calc.pctExecuted    !== 'N/A' ? `${calc.pctExecuted}%`    : '—', group: 'pct' },
    { label: '% Test Cases Not Executed',         value: calc.pctNotExecuted !== 'N/A' ? `${calc.pctNotExecuted}%` : '—', group: 'pct' },
    { label: '% Test Cases Passed',               value: calc.pctPassed  !== 'N/A' ? `${calc.pctPassed}%`  : '—', group: 'pct', highlight: calc.pctPassed !== 'N/A' && parseFloat(calc.pctPassed) >= exitCriteria.minPassRate },
    { label: '% Test Cases Failed',               value: calc.pctFailed  !== 'N/A' ? `${calc.pctFailed}%`  : '—', group: 'pct', warn: calc.pctFailed !== 'N/A' && parseFloat(calc.pctFailed) > 0 },
    { label: '% Test Cases Blocked',              value: calc.pctBlocked !== 'N/A' ? `${calc.pctBlocked}%` : '—', group: 'pct', warn: calc.pctBlocked !== 'N/A' && parseFloat(calc.pctBlocked) > 5 },
  ];

  return (
    <div className="tm-panel">

      {/* Hero */}
      <div className="tm-hero">
        <div className="tm-hero-content">
          <div className="tm-hero-badge">AI Quality Intelligence</div>
          <h2 className="tm-hero-title">Release Confidence Engine</h2>
          <p className="tm-hero-sub">
            Input your raw test data — all metrics are auto-calculated and interpreted.
            Know exactly when your software is ready to ship. Downloadable in 4 formats.
          </p>
          <div className="tm-hero-stats">
            <div className="tm-stat"><span className="tm-stat-num">14</span><span className="tm-stat-label">Raw Inputs</span></div>
            <div className="tm-stat"><span className="tm-stat-num">20</span><span className="tm-stat-label">Metric Rows</span></div>
            <div className="tm-stat"><span className="tm-stat-num">RICE-POT</span><span className="tm-stat-label">Interpretation</span></div>
            <div className="tm-stat"><span className="tm-stat-num">4</span><span className="tm-stat-label">Export Formats</span></div>
          </div>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="tm-layout">

        {/* ── LEFT: Input pane ─────────────────────── */}
        <div className="tm-input-pane">

          {/* Project name */}
          <div className="tm-input-card">
            <div className="tm-section-label">Project / Release</div>
            <input
              className="tm-project-input"
              type="text"
              placeholder="e.g. Sprint 12 — Payment Gateway"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          {/* Input groups */}
          {INPUT_GROUPS.map(group => (
            <div key={group.title} className="tm-input-card">
              <div className="tm-group-header">
                <span className="tm-group-icon">{group.icon}</span>
                <span className="tm-section-label">{group.title}</span>
              </div>
              {group.fields.map(field => (
                <div key={field.key} className="tm-field">
                  <label className="tm-field-label" title={field.source}>{field.label}</label>
                  <input
                    className="tm-number-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={inputs[field.key]}
                    onChange={e => setInput(field.key, e.target.value)}
                  />
                  <div className="tm-field-hint">{field.hint}</div>
                </div>
              ))}
            </div>
          ))}

          {/* Assumptions */}
          <div className="tm-input-card">
            <div className="tm-section-label">Definitional Assumptions</div>
            <p className="tm-assumption-note">Confirm these before calculating (Section 3 of template)</p>

            <label className="tm-toggle-row">
              <input type="checkbox" checked={assumptions.blockedIncludedInExecuted}
                onChange={e => setAssumptions(a => ({ ...a, blockedIncludedInExecuted: e.target.checked }))} />
              <span className="tm-toggle-text">
                <strong>Blocked included in Executed</strong>
                <small>Blocked tests are counted within the Executed total (and excluded from Pass/Fail base)</small>
              </span>
            </label>

            <label className="tm-toggle-row">
              <input type="checkbox" checked={assumptions.customerDefectsAreSubset}
                onChange={e => setAssumptions(a => ({ ...a, customerDefectsAreSubset: e.target.checked }))} />
              <span className="tm-toggle-text">
                <strong>Customer Defects are a subset of Total</strong>
                <small>Customer defects are sourced from the same Bug filter, not tracked independently</small>
              </span>
            </label>
          </div>

          {/* Exit Criteria Config */}
          <div className="tm-input-card">
            <div className="tm-section-label">Exit Criteria Thresholds</div>
            <p className="tm-assumption-note">Used for RICE-POT Criteria (C) assessment</p>

            <div className="tm-ec-row">
              <label>Minimum % Test Cases Passed</label>
              <div className="tm-ec-input-wrap">
                <input
                  type="number" min={0} max={100}
                  value={exitCriteria.minPassRate}
                  onChange={e => setExitCriteria(ec => ({ ...ec, minPassRate: parseFloat(e.target.value) || 0 }))}
                />
                <span className="tm-ec-unit">%</span>
              </div>
            </div>

            <div className="tm-ec-row">
              <label>Max Open Critical Defects at Release</label>
              <div className="tm-ec-input-wrap">
                <input
                  type="number" min={0}
                  value={exitCriteria.maxCriticalDefects}
                  onChange={e => setExitCriteria(ec => ({ ...ec, maxCriticalDefects: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results pane ──────────────────── */}
        <div className="tm-results-pane">

          {/* Reconciliation checks */}
          <div className="tm-results-card">
            <div className="tm-results-section-label">Reconciliation Checks</div>
            <div className="tm-checks">
              <CheckPill
                ok={calc.check1}
                attempted={calc.check1Attempted}
                label="Check 1: Passed + Failed + Blocked + Unexecuted = Total TCs"
                detail={`Got ${calc.check1Detail.sum}, expected ${calc.check1Detail.expected}. Fix inputs before reporting.`}
              />
              <CheckPill
                ok={calc.check2}
                attempted={calc.check2Attempted}
                label="Check 2: Critical + High + Medium + Low = Total Defects"
                detail={`Got ${calc.check2Detail.sum}, expected ${calc.check2Detail.expected}. Fix inputs before reporting.`}
              />
            </div>
          </div>

          {/* Metrics table */}
          <div className="tm-results-card">
            <div className="tm-results-section-label">
              Metrics Table
              {!hasAnyInput && <span className="tm-placeholder-note"> — enter values on the left to populate</span>}
            </div>
            <table className="tm-metrics-table">
              <tbody>
                {METRIC_ROWS.map((row, i) => {
                  const isDivider = row.label.startsWith('%') && i > 0 && !METRIC_ROWS[i-1].label.startsWith('%');
                  return (
                    <React.Fragment key={i}>
                      {isDivider && <tr className="tm-divider-row"><td colSpan={2}></td></tr>}
                      <tr className={`tm-metric-row ${row.group === 'calc' ? 'calc-row' : ''} ${row.group === 'pct' ? 'pct-row' : ''}`}>
                        <td className={`tm-metric-name ${row.severity ? `sev-${row.severity}` : ''}`}>{row.label}</td>
                        <td className={`tm-metric-value ${row.highlight ? 'val-good' : ''} ${row.warn ? 'val-warn' : ''} ${row.severity === 'critical' && row.value > 0 ? 'val-critical' : ''}`}>
                          {String(row.value)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RICE-POT Interpretation */}
          <div className="tm-results-card">
            <div className="tm-results-section-label">RICE-POT Interpretation</div>
            <div className="tm-criteria-bar">
              <span className={`tm-criteria-pill ${calc.critMet ? 'criteria-met' : 'criteria-fail'}`}>
                {calc.critMet ? '✓ EXIT CRITERIA MET' : '✗ EXIT CRITERIA NOT MET'}
              </span>
              <span className="tm-criteria-detail">Pass ≥ {exitCriteria.minPassRate}% · Critical ≤ {exitCriteria.maxCriticalDefects}</span>
            </div>
            <div className="tm-ricepot">
              {Object.entries(calc.ricepot).map(([letter, data]) => (
                <RicepotRow key={letter} letter={letter} data={data} />
              ))}
              <div className="tm-rp-row rp-ok">
                <span className="tm-rp-letter" style={{ background: '#374151' }}>T</span>
                <div className="tm-rp-content">
                  <span className="tm-rp-label">Tools</span>
                  <span className="tm-rp-text">No automation coverage data supplied — omit or supplement with Playwright / Zephyr automation metrics.</span>
                </div>
                <span className="tm-rp-badge badge-omit">OMIT</span>
              </div>
            </div>
          </div>

          {/* Export bar */}
          <div className="tm-export-bar">
            <span className="tm-export-label">Download Report:</span>
            <button className="tm-export-btn btn-md"    onClick={() => exportToMarkdown(inputs, calc, exitCriteria, assumptions, pName)} title="Download as Markdown file">📝 Markdown</button>
            <button className="tm-export-btn btn-csv"   onClick={() => exportToCSV(inputs, calc, exitCriteria, assumptions, pName)}      title="Download as CSV">📊 CSV</button>
            <button className="tm-export-btn btn-excel" onClick={() => exportToExcel(inputs, calc, exitCriteria, assumptions, pName)}    title="Download as Excel (5 sheets)">📗 Excel (.xlsx)</button>
            <button className="tm-export-btn btn-html"  onClick={() => exportToHTML(inputs, calc, exitCriteria, assumptions, pName)}     title="Download as HTML — open in browser and print to PDF">📄 HTML / PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
