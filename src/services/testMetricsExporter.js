/**
 * testMetricsExporter.js
 * Export Test Execution & Defect Metrics in Markdown, CSV, Excel, and HTML (PDF-printable)
 * Based on RICE-POT testmetrics_template.md
 */
import * as XLSX from 'xlsx';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(filename, content, mime = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── RICE-POT interpretation builder ───────────────────────── */
function buildRicepotLines(calc, inputs, exitCriteria, assumptions) {
  const {
    avgTCsPerReq, pctPassed, pctBlocked,
    raw: { critical, custDef, uatDef },
  } = calc;

  const lines = [];

  // R — Risks
  const riskFlags = [];
  if (critical > 0) riskFlags.push(`${critical} Critical defect(s) open`);
  if (custDef > 0) riskFlags.push(`${custDef} Customer-reported defect(s)`);
  if (uatDef > 0) riskFlags.push(`${uatDef} UAT defect(s)`);
  lines.push({
    letter: 'R',
    label: 'Risks',
    flag: riskFlags.length > 0,
    text: riskFlags.length > 0
      ? `FLAGGED — release risk present: ${riskFlags.join('; ')}. Resolve all Critical defects before release.`
      : 'No risk flags — no Critical, Customer, or UAT defects reported.',
  });

  // I — Items
  const avgNum = avgTCsPerReq !== 'N/A' ? parseFloat(avgTCsPerReq) : null;
  lines.push({
    letter: 'I',
    label: 'Items',
    flag: avgNum !== null && avgNum < 2,
    text: avgNum === null
      ? 'Cannot assess — requirements or test case count not provided.'
      : avgNum < 2
        ? `FLAGGED — average ${avgTCsPerReq} test cases per requirement is below the 2.0 threshold; possible under-coverage of requirements.`
        : `No flag — average ${avgTCsPerReq} test cases per requirement indicates adequate coverage.`,
  });

  // C — Criteria
  const passNum = pctPassed !== 'N/A' ? parseFloat(pctPassed) : null;
  const critMet = passNum !== null && passNum >= exitCriteria.minPassRate && critical <= exitCriteria.maxCriticalDefects;
  lines.push({
    letter: 'C',
    label: 'Criteria',
    flag: !critMet,
    text: passNum === null
      ? 'Cannot assess — pass rate not calculable from provided inputs.'
      : critMet
        ? `MET — pass rate ${pctPassed}% meets the ${exitCriteria.minPassRate}% threshold and ${critical === 0 ? 'zero' : critical} Critical defect(s) meet the <= ${exitCriteria.maxCriticalDefects} threshold.`
        : `NOT MET — ${passNum < exitCriteria.minPassRate ? `pass rate ${pctPassed}% is below ${exitCriteria.minPassRate}% threshold` : ''}${passNum < exitCriteria.minPassRate && critical > exitCriteria.maxCriticalDefects ? '; ' : ''}${critical > exitCriteria.maxCriticalDefects ? `${critical} open Critical defect(s) exceed the ${exitCriteria.maxCriticalDefects} threshold` : ''}. Release blocked until criteria are met.`,
  });

  // E — Environment
  lines.push({
    letter: 'E',
    label: 'Environment',
    flag: uatDef > 0,
    text: uatDef > 0
      ? `FLAGGED — ${uatDef} defect(s) found in UAT indicate environment or data gaps not caught in earlier test phases. Review environment parity with production.`
      : 'No environment flag — zero UAT defects; no environment or data gap signal.',
  });

  // P — People
  const blockedNum = pctBlocked !== 'N/A' ? parseFloat(pctBlocked) : null;
  lines.push({
    letter: 'P',
    label: 'People',
    flag: blockedNum !== null && blockedNum > 5,
    text: blockedNum === null
      ? 'Cannot assess — blocked percentage not calculable.'
      : blockedNum > 5
        ? `FLAGGED — ${pctBlocked}% blocked rate exceeds the 5% threshold; may indicate tester dependency or availability issues rather than product defects. Investigate blockers.`
        : `No people flag — ${pctBlocked}% blocked rate is within acceptable bounds.`,
  });

  // O — Objectives
  lines.push({
    letter: 'O',
    label: 'Objectives',
    flag: !critMet,
    text: critMet
      ? 'SUPPORTED — current results support release-readiness; all exit criteria met and quality objectives achieved.'
      : 'NOT SUPPORTED — current results do not yet support the stated release quality objective; Critical defect resolution and/or re-execution of failed cases required before sign-off.',
  });

  // T — Tools (omit if no automation data)
  // We include it with a note about what to add
  lines.push({
    letter: 'T',
    label: 'Tools',
    flag: false,
    text: 'No automation coverage data supplied — omit from report or supplement with Playwright / JIRA-Zephyr automation metrics if available.',
    omit: true,
  });

  return lines;
}

/* ── Build metrics table rows ───────────────────────────────── */
function buildMetricsRows(inputs, calc) {
  const r = calc.raw;
  return [
    ['No. of Requirements', r.req || 'N/A'],
    ['Avg. No. of Test Cases / Requirement', calc.avgTCsPerReq],
    ['Total No. of Test Cases', r.total || 'N/A'],
    ['Test Cases Executed', r.exec || 'N/A'],
    ['Test Cases Passed', r.passed || 'N/A'],
    ['Test Cases Failed', r.failed || 'N/A'],
    ['Test Cases Blocked', r.blocked || 'N/A'],
    ['Test Cases Unexecuted', r.unexec || 'N/A'],
    ['Total Defects Identified', r.totalDef || 'N/A'],
    ['Critical Defects', r.critical || 'N/A'],
    ['High Defects', r.high || 'N/A'],
    ['Medium Defects', r.medium || 'N/A'],
    ['Low Defects', r.low || 'N/A'],
    ['Customer Defects', r.custDef || 'N/A'],
    ['Defects in UAT', r.uatDef || 'N/A'],
    ['% Test Cases Executed', calc.pctExecuted !== 'N/A' ? `${calc.pctExecuted}%` : 'N/A'],
    ['% Test Cases Not Executed', calc.pctNotExecuted !== 'N/A' ? `${calc.pctNotExecuted}%` : 'N/A'],
    ['% Test Cases Passed', calc.pctPassed !== 'N/A' ? `${calc.pctPassed}%` : 'N/A'],
    ['% Test Cases Failed', calc.pctFailed !== 'N/A' ? `${calc.pctFailed}%` : 'N/A'],
    ['% Test Cases Blocked', calc.pctBlocked !== 'N/A' ? `${calc.pctBlocked}%` : 'N/A'],
  ];
}

/* ── MARKDOWN export ────────────────────────────────────────── */
export function exportToMarkdown(inputs, calc, exitCriteria, assumptions, projectName = 'Release') {
  const rows = buildMetricsRows(inputs, calc);
  const ricepot = buildRicepotLines(calc, inputs, exitCriteria, assumptions);

  const check1Status = calc.check1Attempted
    ? (calc.check1 ? '✅ PASS' : `❌ FAIL — sum = ${calc.check1Detail.sum}, expected ${calc.check1Detail.expected}`)
    : 'N/A';
  const check2Status = calc.check2Attempted
    ? (calc.check2 ? '✅ PASS' : `❌ FAIL — sum = ${calc.check2Detail.sum}, expected ${calc.check2Detail.expected}`)
    : 'N/A';

  const lines = [
    `# Test Execution & Defect Metrics Report`,
    ``,
    `**Project / Release:** ${projectName}  `,
    `**Generated:** ${new Date().toLocaleString()}  `,
    `**Framework:** RICE-POT (Risks · Items · Criteria · Environment · People · Objectives · Tools)`,
    ``,
    `---`,
    ``,
    `## Reconciliation Checks`,
    ``,
    `| Check | Status |`,
    `|---|---|`,
    `| Check 1: Passed + Failed + Blocked + Unexecuted = Total TCs | ${check1Status} |`,
    `| Check 2: Critical + High + Medium + Low = Total Defects | ${check2Status} |`,
    ``,
    `---`,
    ``,
    `## Metrics Table`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    ...rows.map(([m, v]) => `| ${m} | ${v} |`),
    ``,
    `---`,
    ``,
    `## RICE-POT Interpretation`,
    ``,
    ...ricepot
      .filter(l => !l.omit)
      .map(l => `- **${l.label}:** ${l.text}`),
    ``,
    `---`,
    ``,
    `## Definitional Assumptions`,
    ``,
    `- **Blocked in Executed:** ${assumptions.blockedIncludedInExecuted ? 'Blocked IS included in Executed (default)' : 'Blocked is NOT included in Executed'}`,
    `- **Customer Defects Scope:** ${assumptions.customerDefectsAreSubset ? 'Customer Defects are a subset of Total Defects (default)' : 'Customer Defects are tracked independently'}`,
    ``,
    `## Exit Criteria Thresholds`,
    ``,
    `- **Minimum Pass Rate:** ${exitCriteria.minPassRate}%`,
    `- **Maximum Open Critical Defects at Release:** ${exitCriteria.maxCriticalDefects}`,
    ``,
    `---`,
    ``,
    `*Generated by B.L.A.S.T. QA Platform — RICE-POT Test Metrics Module*`,
  ];

  triggerDownload(
    `TestMetrics_${projectName.replace(/\s+/g, '_')}_${stamp()}.md`,
    lines.join('\n'),
    'text/markdown;charset=utf-8;',
  );
}

/* ── CSV export ─────────────────────────────────────────────── */
export function exportToCSV(inputs, calc, exitCriteria, assumptions, projectName = 'Release') {
  const rows = buildMetricsRows(inputs, calc);
  const ricepot = buildRicepotLines(calc, inputs, exitCriteria, assumptions);

  function esc(v = '') {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const csvLines = [
    '# TEST EXECUTION & DEFECT METRICS REPORT',
    `# Project: ${projectName} | Generated: ${new Date().toLocaleString()}`,
    '',
    'SECTION,METRIC,VALUE',
    ...rows.map(([m, v]) => `Metrics Table,${esc(m)},${esc(String(v))}`),
    '',
    'SECTION,LETTER,LABEL,FLAG,INTERPRETATION',
    ...ricepot.filter(l => !l.omit).map(l => `RICE-POT,${l.letter},${l.label},${l.flag ? 'FLAGGED' : 'OK'},${esc(l.text)}`),
    '',
    'SECTION,CHECK,STATUS',
    `Reconciliation,Check 1 (Passed+Failed+Blocked+Unexecuted=Total TCs),${calc.check1Attempted ? (calc.check1 ? 'PASS' : 'FAIL') : 'N/A'}`,
    `Reconciliation,Check 2 (Critical+High+Medium+Low=Total Defects),${calc.check2Attempted ? (calc.check2 ? 'PASS' : 'FAIL') : 'N/A'}`,
    '',
    'SECTION,ASSUMPTION,VALUE',
    `Assumptions,Blocked included in Executed,${assumptions.blockedIncludedInExecuted ? 'Yes (default)' : 'No'}`,
    `Assumptions,Customer Defects are subset of Total,${assumptions.customerDefectsAreSubset ? 'Yes (default)' : 'No'}`,
    `Assumptions,Minimum Pass Rate Exit Criterion,${exitCriteria.minPassRate}%`,
    `Assumptions,Max Critical Defects at Release,${exitCriteria.maxCriticalDefects}`,
  ];

  triggerDownload(
    `TestMetrics_${projectName.replace(/\s+/g, '_')}_${stamp()}.csv`,
    csvLines.join('\n'),
    'text/csv;charset=utf-8;',
  );
}

/* ── EXCEL export ───────────────────────────────────────────── */
export function exportToExcel(inputs, calc, exitCriteria, assumptions, projectName = 'Release') {
  const wb = XLSX.utils.book_new();
  const rows = buildMetricsRows(inputs, calc);
  const ricepot = buildRicepotLines(calc, inputs, exitCriteria, assumptions);

  /* Sheet 1: Metrics Table */
  const metricsData = [
    ['Test Execution & Defect Metrics Report'],
    [`Project / Release: ${projectName}`],
    [`Generated: ${new Date().toLocaleString()}`],
    ['Framework: RICE-POT'],
    [],
    ['Metric', 'Value'],
    ...rows,
  ];
  const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
  wsMetrics['!cols'] = [{ wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics Table');

  /* Sheet 2: RICE-POT Interpretation */
  const ricepotData = [
    ['RICE-POT Interpretation'],
    [`Project: ${projectName}`],
    [],
    ['Letter', 'Dimension', 'Status', 'Interpretation'],
    ...ricepot.filter(l => !l.omit).map(l => [l.letter, l.label, l.flag ? 'FLAGGED' : 'OK', l.text]),
  ];
  const wsRicepot = XLSX.utils.aoa_to_sheet(ricepotData);
  wsRicepot['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsRicepot, 'RICE-POT Interpretation');

  /* Sheet 3: Reconciliation Checks */
  const reconData = [
    ['Reconciliation Checks'],
    [],
    ['Check', 'Formula', 'Result', 'Status'],
    [
      'Check 1',
      'Passed + Failed + Blocked + Unexecuted = Total TCs',
      calc.check1Attempted ? `${calc.check1Detail.sum} vs ${calc.check1Detail.expected}` : 'N/A',
      calc.check1Attempted ? (calc.check1 ? 'PASS' : 'FAIL') : 'N/A',
    ],
    [
      'Check 2',
      'Critical + High + Medium + Low = Total Defects',
      calc.check2Attempted ? `${calc.check2Detail.sum} vs ${calc.check2Detail.expected}` : 'N/A',
      calc.check2Attempted ? (calc.check2 ? 'PASS' : 'FAIL') : 'N/A',
    ],
  ];
  const wsRecon = XLSX.utils.aoa_to_sheet(reconData);
  wsRecon['!cols'] = [{ wch: 10 }, { wch: 50 }, { wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsRecon, 'Reconciliation Checks');

  /* Sheet 4: Raw Inputs & Settings */
  const inputsData = [
    ['Raw Inputs & Configuration'],
    [],
    ['Field', 'Value'],
    ['No. of Requirements', inputs.requirements || ''],
    ['Total No. of Test Cases', inputs.totalTestCases || ''],
    ['Test Cases Executed', inputs.executed || ''],
    ['Test Cases Passed', inputs.passed || ''],
    ['Test Cases Failed', inputs.failed || ''],
    ['Test Cases Blocked', inputs.blocked || ''],
    ['Test Cases Unexecuted', inputs.unexecuted || ''],
    ['Total Defects Identified', inputs.totalDefects || ''],
    ['Critical Defects', inputs.critical || ''],
    ['High Defects', inputs.high || ''],
    ['Medium Defects', inputs.medium || ''],
    ['Low Defects', inputs.low || ''],
    ['Customer Defects', inputs.customerDefects || ''],
    ['Defects in UAT', inputs.uatDefects || ''],
    [],
    ['Configuration', 'Value'],
    ['Blocked included in Executed denominator', assumptions.blockedIncludedInExecuted ? 'Yes (default)' : 'No'],
    ['Customer Defects are subset of Total', assumptions.customerDefectsAreSubset ? 'Yes (default)' : 'No'],
    ['Minimum Pass Rate Exit Criterion (%)', exitCriteria.minPassRate],
    ['Max Open Critical Defects at Release', exitCriteria.maxCriticalDefects],
  ];
  const wsInputs = XLSX.utils.aoa_to_sheet(inputsData);
  wsInputs['!cols'] = [{ wch: 45 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsInputs, 'Raw Inputs');

  /* Sheet 5: Formulas Reference */
  const formulasData = [
    ['Calculation Rules Reference (RICE-POT testmetrics_template.md)'],
    [],
    ['Metric', 'Formula', 'Notes'],
    ['Avg. No. of Test Cases/Requirement', 'Total TCs / No. of Requirements', 'Round to 1 decimal'],
    ['% Test Cases Executed', '(Executed / Total TCs) × 100', 'Round to 1 decimal'],
    ['% Test Cases Not Executed', '(Unexecuted / Total TCs) × 100', 'Round to 1 decimal'],
    ['% Test Cases Passed', '(Passed / Executed) × 100', 'Denominator is Executed (includes Blocked per default assumption)'],
    ['% Test Cases Failed', '(Failed / Executed) × 100', 'Denominator is Executed'],
    ['% Test Cases Blocked', '(Blocked / Executed) × 100', 'Denominator is Executed'],
    [],
    ['Reconciliation Rule', 'Formula'],
    ['Check 1', 'Passed + Failed + Blocked + Unexecuted = Total TCs'],
    ['Check 2', 'Critical + High + Medium + Low = Total Defects Identified'],
    [],
    ['Default Exit Criteria', 'Value'],
    ['Minimum Pass Rate', '95%'],
    ['Maximum Open Critical Defects at Release', '0'],
  ];
  const wsFormulas = XLSX.utils.aoa_to_sheet(formulasData);
  wsFormulas['!cols'] = [{ wch: 40 }, { wch: 45 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsFormulas, 'Formulas Reference');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerBlobDownload(blob, `TestMetrics_${projectName.replace(/\s+/g, '_')}_${stamp()}.xlsx`);
}

/* ── HTML (PDF-printable) export ────────────────────────────── */
export function exportToHTML(inputs, calc, exitCriteria, assumptions, projectName = 'Release') {
  const rows = buildMetricsRows(inputs, calc);
  const ricepot = buildRicepotLines(calc, inputs, exitCriteria, assumptions);

  const metricsTableHTML = rows.map(([m, v]) => `
    <tr>
      <td class="metric-name">${m}</td>
      <td class="metric-value ${String(v).includes('%') && parseFloat(v) >= exitCriteria.minPassRate && m.includes('Passed') ? 'good' : ''}">${v}</td>
    </tr>`).join('');

  const ricepotHTML = ricepot
    .filter(l => !l.omit)
    .map(l => `
    <div class="ricepot-item ${l.flag ? 'flag' : 'ok'}">
      <div class="ricepot-letter">${l.letter}</div>
      <div class="ricepot-content">
        <div class="ricepot-label">${l.label}</div>
        <div class="ricepot-text">${l.text}</div>
      </div>
      <div class="ricepot-badge ${l.flag ? 'badge-flag' : 'badge-ok'}">${l.flag ? 'FLAGGED' : 'OK'}</div>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Metrics Report — ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #f9fafb; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; background: white; padding: 48px; }
    /* Header */
    .report-header { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color: white; padding: 32px; border-radius: 12px; margin-bottom: 32px; }
    .report-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
    .report-meta { font-size: 12px; opacity: 0.8; margin-top: 8px; }
    .report-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; margin-bottom: 8px; }
    /* Section */
    h2 { font-size: 15px; font-weight: 700; color: #1e1b4b; margin: 28px 0 14px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    /* Checks */
    .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
    .check-card { padding: 14px 18px; border-radius: 8px; border: 1px solid; }
    .check-card.pass { background: #f0fdf4; border-color: #22c55e; }
    .check-card.fail { background: #fef2f2; border-color: #ef4444; }
    .check-card.na  { background: #f9fafb; border-color: #d1d5db; }
    .check-status { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .check-card.pass .check-status { color: #16a34a; }
    .check-card.fail .check-status { color: #dc2626; }
    .check-detail { font-size: 11px; color: #6b7280; }
    /* Metrics table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #1e1b4b; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 9px 14px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #f9fafb; }
    .metric-name { font-weight: 500; color: #374151; }
    .metric-value { font-weight: 700; color: #1e1b4b; font-size: 14px; }
    .metric-value.good { color: #16a34a; }
    /* RICE-POT */
    .ricepot-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-radius: 8px; margin-bottom: 8px; border: 1px solid; }
    .ricepot-item.flag { background: #fef2f2; border-color: #fecaca; }
    .ricepot-item.ok   { background: #f0fdf4; border-color: #bbf7d0; }
    .ricepot-letter { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; flex-shrink: 0; color: white; }
    .ricepot-item.flag .ricepot-letter { background: #ef4444; }
    .ricepot-item.ok .ricepot-letter   { background: #22c55e; }
    .ricepot-label { font-weight: 700; font-size: 12px; color: #374151; margin-bottom: 2px; }
    .ricepot-text  { font-size: 12px; color: #4b5563; line-height: 1.5; }
    .ricepot-content { flex: 1; }
    .ricepot-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; height: fit-content; white-space: nowrap; }
    .badge-flag { background: #fee2e2; color: #dc2626; }
    .badge-ok   { background: #dcfce7; color: #16a34a; }
    /* Assumptions */
    .assumptions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
    .assumptions p { margin-bottom: 4px; font-size: 12px; color: #475569; }
    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print {
      body { background: white; }
      .page { max-width: 100%; padding: 20px; box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="report-header">
    <div class="report-badge">RICE-POT Framework</div>
    <div class="report-title">Test Execution &amp; Defect Metrics Report</div>
    <div class="report-meta">
      <strong>Project / Release:</strong> ${projectName} &nbsp;|&nbsp;
      <strong>Generated:</strong> ${new Date().toLocaleString()} &nbsp;|&nbsp;
      <strong>Framework:</strong> RICE-POT Test Metrics Template
    </div>
  </div>

  <h2>Reconciliation Checks</h2>
  <div class="checks">
    <div class="check-card ${calc.check1Attempted ? (calc.check1 ? 'pass' : 'fail') : 'na'}">
      <div class="check-status">${calc.check1Attempted ? (calc.check1 ? '✓ CHECK 1 PASSED' : '✗ CHECK 1 FAILED') : 'CHECK 1 — N/A'}</div>
      <div class="check-detail">Passed + Failed + Blocked + Unexecuted = Total TCs${calc.check1Attempted && !calc.check1 ? `<br>Got ${calc.check1Detail.sum}, expected ${calc.check1Detail.expected}` : ''}</div>
    </div>
    <div class="check-card ${calc.check2Attempted ? (calc.check2 ? 'pass' : 'fail') : 'na'}">
      <div class="check-status">${calc.check2Attempted ? (calc.check2 ? '✓ CHECK 2 PASSED' : '✗ CHECK 2 FAILED') : 'CHECK 2 — N/A'}</div>
      <div class="check-detail">Critical + High + Medium + Low = Total Defects${calc.check2Attempted && !calc.check2 ? `<br>Got ${calc.check2Detail.sum}, expected ${calc.check2Detail.expected}` : ''}</div>
    </div>
  </div>

  <h2>Metrics Table</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${metricsTableHTML}</tbody>
  </table>

  <h2>RICE-POT Interpretation</h2>
  ${ricepotHTML}

  <h2>Definitional Assumptions &amp; Exit Criteria</h2>
  <div class="assumptions">
    <p><strong>Blocked in Executed:</strong> ${assumptions.blockedIncludedInExecuted ? 'Blocked IS included in Executed count (default)' : 'Blocked is NOT included in Executed count'}</p>
    <p><strong>Customer Defects Scope:</strong> ${assumptions.customerDefectsAreSubset ? 'Customer Defects are a subset of Total Defects (default)' : 'Customer Defects are tracked independently from Total Defects'}</p>
    <p><strong>Exit Criterion — Minimum Pass Rate:</strong> ${exitCriteria.minPassRate}%</p>
    <p><strong>Exit Criterion — Max Open Critical Defects at Release:</strong> ${exitCriteria.maxCriticalDefects}</p>
  </div>

  <div class="footer">
    Generated by B.L.A.S.T. QA Platform &mdash; RICE-POT Test Metrics Module &mdash; ${new Date().toLocaleDateString()}
  </div>

</div>
</body>
</html>`;

  triggerDownload(
    `TestMetrics_${projectName.replace(/\s+/g, '_')}_${stamp()}.html`,
    html,
    'text/html;charset=utf-8;',
  );
}

/* ── Strategy HTML export ───────────────────────────────────── */
export function exportStrategyToHTML(strategy) {
  const meta = strategy.metadata || {};
  const productName = strategy.productName || meta.productName || 'Product';

  const riskRows = (strategy.risks?.register || []).map(r => `
    <tr>
      <td>${r.id}</td><td>${r.category}</td>
      <td>${r.risk}</td><td>${r.probability}</td><td>${r.impact}</td>
      <td class="score-${(r.riskScore || '').toLowerCase()}">${r.riskScore}</td>
      <td>${r.mitigation}</td><td>${r.contingency}</td><td>${r.owner}</td>
    </tr>`).join('');

  const inScopeRows = (strategy.items?.inScope || []).map(i => `
    <tr><td>${i.item}</td><td>${i.priority}</td><td>${i.testingType}</td><td>${i.riskLevel}</td><td>${i.rationale}</td></tr>`).join('');

  const phasesHTML = (strategy.criteria?.phases || []).map(p => `
    <div class="phase-card">
      <div class="phase-header"><strong>${p.phase}</strong> <span class="phase-dur">${p.duration}</span></div>
      <div class="phase-cols">
        <div><div class="phase-label">Entry Criteria</div><ul>${(p.entryCriteria || []).map(c => `<li>${c}</li>`).join('')}</ul></div>
        <div><div class="phase-label">Exit Criteria</div><ul>${(p.exitCriteria || []).map(c => `<li>${c}</li>`).join('')}</ul></div>
      </div>
    </div>`).join('');

  const envRows = (strategy.environment?.environments || []).map(e => `
    <tr><td>${e.name}</td><td>${e.type}</td><td>${e.purpose}</td><td>${e.dataStrategy}</td><td>${e.owner}</td></tr>`).join('');

  const rolesHTML = (strategy.people?.roles || []).map(r => `
    <div class="role-card">
      <div class="role-name">${r.role} <span class="role-alloc">${r.allocation}</span></div>
      <ul>${(r.responsibilities || []).map(x => `<li>${x}</li>`).join('')}</ul>
    </div>`).join('');

  const raciRows = (strategy.people?.raci || []).map(r => `
    <tr><td>${r.activity}</td><td class="raci-r">${r.responsible}</td><td class="raci-a">${r.accountable}</td><td>${r.consulted}</td><td>${r.informed}</td></tr>`).join('');

  const objRows = (strategy.objectives?.objectives || []).map(o => `
    <tr><td>${o.objective}</td><td>${o.kpi}</td><td class="target">${o.target}</td><td>${o.measurement}</td></tr>`).join('');

  const toolsHTML = (strategy.tools?.categories || []).map(t => `
    <div class="tool-card">
      <div class="tool-name">${t.category}</div>
      <div class="tool-primary"><strong>Primary:</strong> ${t.primary}</div>
      <div class="tool-alt"><strong>Alternative:</strong> ${t.alternative || '—'}</div>
      <div class="tool-rationale">${t.rationale}</div>
      ${t.licenceType ? `<div class="tool-licence"><strong>Licence:</strong> ${t.licenceType}</div>` : ''}
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RICE-POT Test Strategy — ${productName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #f9fafb; }
    .page { max-width: 1000px; margin: 0 auto; background: white; padding: 48px; }
    .report-header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #4338ca 100%); color: white; padding: 36px; border-radius: 12px; margin-bottom: 36px; }
    .report-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 3px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; margin-bottom: 10px; }
    .report-title { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
    .report-sub { font-size: 13px; opacity: 0.8; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
    .meta-cell { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; }
    .meta-label { font-size: 10px; opacity: 0.7; margin-bottom: 2px; }
    .meta-val { font-size: 13px; font-weight: 700; }
    h2 { font-size: 16px; font-weight: 700; color: #1e1b4b; margin: 36px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }
    .section-letter { background: #4338ca; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
    .summary-box { background: #f0f4ff; border-left: 4px solid #4338ca; padding: 16px 20px; border-radius: 0 8px 8px 0; line-height: 1.7; font-size: 13px; color: #374151; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
    th { background: #1e1b4b; color: white; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    .score-high { color: #dc2626; font-weight: 700; }
    .score-medium { color: #d97706; font-weight: 700; }
    .score-low { color: #16a34a; font-weight: 700; }
    .target { color: #4338ca; font-weight: 700; }
    .raci-r { color: #16a34a; font-weight: 600; }
    .raci-a { color: #dc2626; font-weight: 600; }
    ul { padding-left: 18px; }
    li { margin-bottom: 3px; }
    .out-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .out-item { background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .phase-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 10px; }
    .phase-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
    .phase-dur { background: #e0e7ff; color: #4338ca; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .phase-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px; }
    .phase-label { font-weight: 700; color: #4338ca; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .role-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 8px; font-size: 12px; }
    .role-name { font-weight: 700; font-size: 13px; color: #1e1b4b; margin-bottom: 6px; }
    .role-alloc { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-left: 8px; }
    .tool-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 8px; }
    .tool-name { font-weight: 800; color: #1e1b4b; font-size: 13px; margin-bottom: 6px; }
    .tool-primary, .tool-alt, .tool-licence { font-size: 12px; margin-bottom: 4px; }
    .tool-rationale { font-size: 12px; color: #6b7280; margin-top: 6px; font-style: italic; }
    .release-criteria { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; }
    .release-criteria li { color: #15803d; margin-bottom: 4px; font-size: 12px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { background: white; } .page { padding: 20px; } }
  </style>
</head>
<body>
<div class="page">

  <div class="report-header">
    <div class="report-badge">RICE-POT Test Strategy</div>
    <div class="report-title">${productName} — Test Strategy Document</div>
    <div class="report-sub">B.L.A.S.T. Framework &nbsp;|&nbsp; ${meta.productType || ''} &nbsp;|&nbsp; v${meta.version || '1.0'}</div>
    <div class="meta-grid">
      <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-val">${meta.status || 'Draft'}</div></div>
      <div class="meta-cell"><div class="meta-label">Version</div><div class="meta-val">${meta.documentVersion || '1.0'}</div></div>
      <div class="meta-cell"><div class="meta-label">Owner</div><div class="meta-val">${meta.owner || 'QA Lead'}</div></div>
      <div class="meta-cell"><div class="meta-label">Date</div><div class="meta-val">${meta.createdDate || new Date().toISOString().split('T')[0]}</div></div>
    </div>
  </div>

  ${strategy.executiveSummary ? `<div class="summary-box">${strategy.executiveSummary}</div>` : ''}

  <h2><span class="section-letter">R</span> Risks</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.risks?.overview || ''}</p>
  <table>
    <thead><tr><th>ID</th><th>Category</th><th>Risk</th><th>Probability</th><th>Impact</th><th>Score</th><th>Mitigation</th><th>Contingency</th><th>Owner</th></tr></thead>
    <tbody>${riskRows}</tbody>
  </table>

  <h2><span class="section-letter">I</span> Items (Scope)</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.items?.overview || ''}</p>
  <table>
    <thead><tr><th>In-Scope Item</th><th>Priority</th><th>Testing Type</th><th>Risk Level</th><th>Rationale</th></tr></thead>
    <tbody>${inScopeRows}</tbody>
  </table>
  <div style="margin-top:12px"><strong style="font-size:12px">Out of Scope:</strong>
  <div class="out-list" style="margin-top:6px">${(strategy.items?.outOfScope || []).map(i => `<span class="out-item">${i}</span>`).join('')}</div></div>

  <h2><span class="section-letter">C</span> Criteria</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.criteria?.overview || ''}</p>
  ${phasesHTML}
  <div class="release-criteria" style="margin-top:16px">
    <strong style="font-size:12px;color:#15803d;display:block;margin-bottom:8px">Release Exit Criteria</strong>
    <ul>${(strategy.criteria?.releaseExitCriteria || []).map(c => `<li>${c}</li>`).join('')}</ul>
  </div>

  <h2><span class="section-letter">E</span> Environment</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.environment?.overview || ''}</p>
  <table>
    <thead><tr><th>Environment</th><th>Type</th><th>Purpose</th><th>Data Strategy</th><th>Owner</th></tr></thead>
    <tbody>${envRows}</tbody>
  </table>

  <h2><span class="section-letter">P</span> People</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.people?.overview || ''}</p>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px">${rolesHTML}</div>
  <strong style="font-size:12px;display:block;margin-bottom:8px">RACI Chart</strong>
  <table>
    <thead><tr><th>Activity</th><th>Responsible</th><th>Accountable</th><th>Consulted</th><th>Informed</th></tr></thead>
    <tbody>${raciRows}</tbody>
  </table>

  <h2><span class="section-letter">O</span> Objectives</h2>
  <div class="summary-box" style="margin-bottom:16px">${strategy.objectives?.qualityVision || ''}</div>
  <table>
    <thead><tr><th>Objective</th><th>KPI</th><th>Target</th><th>Measurement</th></tr></thead>
    <tbody>${objRows}</tbody>
  </table>

  <h2><span class="section-letter">T</span> Tools</h2>
  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">${strategy.tools?.overview || ''}</p>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${toolsHTML}</div>

  <div class="footer">Generated by B.L.A.S.T. QA Platform &mdash; RICE-POT Test Strategy Module &mdash; ${new Date().toLocaleString()}</div>

</div>
</body>
</html>`;

  triggerDownload(
    `TestStrategy_${productName.replace(/\s+/g, '_')}_${stamp()}.html`,
    html,
    'text/html;charset=utf-8;',
  );
}

/* ── Strategy Markdown export ───────────────────────────────── */
export function exportStrategyToMarkdown(strategy) {
  const meta = strategy.metadata || {};
  const productName = strategy.productName || meta.productName || 'Product';

  const lines = [
    `# RICE-POT Test Strategy — ${productName}`,
    ``,
    `**Status:** ${meta.status || 'Draft'}  `,
    `**Version:** ${meta.documentVersion || '1.0'}  `,
    `**Product Version:** ${meta.version || '1.0'}  `,
    `**Owner:** ${meta.owner || 'QA Lead'}  `,
    `**Date:** ${meta.createdDate || new Date().toISOString().split('T')[0]}  `,
    `**Classification:** ${meta.classification || 'Internal'}`,
    ``,
    `---`,
    ``,
    `## Executive Summary`,
    ``,
    strategy.executiveSummary || '',
    ``,
    `---`,
    ``,
    `## R — Risks`,
    ``,
    `_${strategy.risks?.overview || ''}_`,
    ``,
    `| ID | Category | Risk | Probability | Impact | Score | Mitigation | Contingency | Owner |`,
    `|---|---|---|---|---|---|---|---|---|`,
    ...(strategy.risks?.register || []).map(r => `| ${r.id} | ${r.category} | ${r.risk} | ${r.probability} | ${r.impact} | **${r.riskScore}** | ${r.mitigation} | ${r.contingency} | ${r.owner} |`),
    ``,
    `---`,
    ``,
    `## I — Items (Scope)`,
    ``,
    `_${strategy.items?.overview || ''}_`,
    ``,
    `### In Scope`,
    ``,
    `| Item | Priority | Testing Type | Risk Level | Rationale |`,
    `|---|---|---|---|---|`,
    ...(strategy.items?.inScope || []).map(i => `| ${i.item} | ${i.priority} | ${i.testingType} | ${i.riskLevel} | ${i.rationale} |`),
    ``,
    `### Out of Scope`,
    ``,
    ...(strategy.items?.outOfScope || []).map(i => `- ${i}`),
    ``,
    `### Assumptions`,
    ``,
    ...(strategy.items?.assumptions || []).map(a => `- ${a}`),
    ``,
    `---`,
    ``,
    `## C — Criteria`,
    ``,
    `_${strategy.criteria?.overview || ''}_`,
    ``,
    ...(strategy.criteria?.phases || []).map(p => [
      `### ${p.phase} (${p.duration})`,
      ``,
      `**Entry Criteria:**`,
      ...(p.entryCriteria || []).map(c => `- ${c}`),
      ``,
      `**Exit Criteria:**`,
      ...(p.exitCriteria || []).map(c => `- ${c}`),
      ``,
    ].join('\n')),
    `### Release Exit Criteria`,
    ``,
    ...(strategy.criteria?.releaseExitCriteria || []).map(c => `- ${c}`),
    ``,
    `---`,
    ``,
    `## E — Environment`,
    ``,
    `_${strategy.environment?.overview || ''}_`,
    ``,
    `| Environment | Type | Purpose | Data Strategy | Owner |`,
    `|---|---|---|---|---|`,
    ...(strategy.environment?.environments || []).map(e => `| ${e.name} | ${e.type} | ${e.purpose} | ${e.dataStrategy} | ${e.owner} |`),
    ``,
    `---`,
    ``,
    `## P — People`,
    ``,
    `_${strategy.people?.overview || ''}_`,
    ``,
    ...(strategy.people?.roles || []).map(r => [
      `### ${r.role} (${r.allocation})`,
      ``,
      `**Responsibilities:**`,
      ...(r.responsibilities || []).map(x => `- ${x}`),
      ``,
    ].join('\n')),
    `### RACI Chart`,
    ``,
    `| Activity | Responsible | Accountable | Consulted | Informed |`,
    `|---|---|---|---|---|`,
    ...(strategy.people?.raci || []).map(r => `| ${r.activity} | ${r.responsible} | ${r.accountable} | ${r.consulted} | ${r.informed} |`),
    ``,
    `---`,
    ``,
    `## O — Objectives`,
    ``,
    `**Quality Vision:** ${strategy.objectives?.qualityVision || ''}`,
    ``,
    `| Objective | KPI | Target | Measurement |`,
    `|---|---|---|---|`,
    ...(strategy.objectives?.objectives || []).map(o => `| ${o.objective} | ${o.kpi} | ${o.target} | ${o.measurement} |`),
    ``,
    `---`,
    ``,
    `## T — Tools`,
    ``,
    `_${strategy.tools?.overview || ''}_`,
    ``,
    ...(strategy.tools?.categories || []).map(t => [
      `### ${t.category}`,
      ``,
      `- **Primary:** ${t.primary}`,
      `- **Alternative:** ${t.alternative || '—'}`,
      `- **Rationale:** ${t.rationale}`,
      t.licenceType ? `- **Licence:** ${t.licenceType}` : '',
      ``,
    ].filter(Boolean).join('\n')),
    `---`,
    ``,
    `*Generated by B.L.A.S.T. QA Platform — RICE-POT Test Strategy Module*`,
  ];

  triggerDownload(
    `TestStrategy_${productName.replace(/\s+/g, '_')}_${stamp()}.md`,
    lines.join('\n'),
    'text/markdown;charset=utf-8;',
  );
}
