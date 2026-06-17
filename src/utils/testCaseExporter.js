/**
 * testCaseExporter.js
 * Export test cases to tool-specific formats:
 *   JIRA native CSV  |  XRay CSV  |  Zephyr Scale CSV
 *   YouTrack CSV     |  Generic CSV (all 23 fields)
 *   JSON             |  Markdown  |  Excel (.xlsx)
 */
import * as XLSX from 'xlsx';

/* ── helpers ──────────────────────────────────────────────────── */

function esc(v = '') {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(headers, rows) {
  const headerLine = headers.map(esc).join(',');
  const dataLines = rows.map(row => row.map(esc).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function triggerDownload(filename, content, mime = 'text/csv;charset=utf-8;') {
  const bom = mime.includes('csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/* ── JIRA native CSV ──────────────────────────────────────────── */
/*
 * Maps to JIRA's standard CSV import.  The "Description" column
 * contains the full test body so it can be imported into JIRA
 * (Story / Test issue type) without a plugin.
 */
export function exportToJIRA(testCases, filename = `JIRA_TestCases_${stamp()}.csv`) {
  const headers = [
    'Summary', 'Issue Type', 'Priority', 'Component/s', 'Labels',
    'Description', 'Reporter', 'Assignee', 'Sprint', 'Fix Version/s', 'Environment',
  ];

  const rows = testCases.map(tc => {
    const desc =
      `PRECONDITIONS:\n${tc.preconditions}\n\nTEST STEPS:\n${tc.testSteps}\n\nTEST DATA:\n${tc.testData}\n\nEXPECTED RESULT:\n${tc.expectedResult}`;
    return [
      `${tc.testCaseId}: ${tc.summary}`,
      'Test',
      tc.priority,
      tc.component,
      tc.labels,
      desc,
      tc.reporter,
      tc.assignee,
      tc.sprint,
      '',
      tc.testEnvironment,
    ];
  });

  triggerDownload(filename, buildCSV(headers, rows));
}

/* ── XRay for JIRA CSV ────────────────────────────────────────── */
/*
 * XRay Test issue import schema.
 * One row per test case; steps are kept as a numbered list in
 * the "Steps (JSON)" column so XRay's importer can parse them.
 */
export function exportToXRay(testCases, filename = `XRay_TestCases_${stamp()}.csv`) {
  const headers = [
    'Test Case ID', 'Summary', 'Test Type', 'Execution Type',
    'Priority', 'Severity', 'Component', 'Labels',
    'Precondition', 'Test Step', 'Test Data', 'Expected Result',
    'Reporter', 'Assignee', 'Sprint', 'Environment', 'Created Date',
    'Linked Story/Epic Key', 'Comments',
  ];

  const rows = testCases.map(tc => [
    tc.testCaseId,
    tc.summary,
    tc.testType,
    tc.executionType,
    tc.priority,
    tc.severity,
    tc.component,
    tc.labels,
    tc.preconditions,
    tc.testSteps,
    tc.testData,
    tc.expectedResult,
    tc.reporter,
    tc.assignee,
    tc.sprint,
    tc.testEnvironment,
    tc.createdDate,
    tc.linkedStoryKey,
    tc.comments,
  ]);

  triggerDownload(filename, buildCSV(headers, rows));
}

/* ── Zephyr Scale CSV ─────────────────────────────────────────── */
export function exportToZephyr(testCases, filename = `Zephyr_TestCases_${stamp()}.csv`) {
  const headers = [
    'Name', 'Status', 'Priority', 'Labels', 'Component', 'Folder',
    'Description', 'Test Script', 'Environment', 'Sprint',
    'Assignee', 'Created Date', 'Comments',
  ];

  const rows = testCases.map(tc => {
    const folder = `/${tc.component}`;
    const desc = `Preconditions: ${tc.preconditions}\nTest Data: ${tc.testData}`;
    // Zephyr script: steps separated by pipe, each "action → expected"
    const script = tc.testSteps
      .split('\n')
      .filter(Boolean)
      .map(step => `${step} → ${tc.expectedResult}`)
      .join(' | ');

    return [
      tc.summary,
      tc.status || 'Not Executed',
      tc.priority,
      tc.labels,
      tc.component,
      folder,
      desc,
      script,
      tc.testEnvironment,
      tc.sprint,
      tc.assignee,
      tc.createdDate,
      tc.comments,
    ];
  });

  triggerDownload(filename, buildCSV(headers, rows));
}

/* ── YouTrack CSV ─────────────────────────────────────────────── */
/*
 * YouTrack issue import via CSV.
 * Test cases map to YouTrack "Task" or custom "Test Case" issue type.
 */
export function exportToYouTrack(testCases, filename = `YouTrack_TestCases_${stamp()}.csv`) {
  const headers = [
    'ID', 'Summary', 'Priority', 'Type', 'State', 'Subsystem',
    'Tags', 'Description', 'Environment', 'Sprint',
    'Assignee', 'Created', 'Comments',
  ];

  const rows = testCases.map(tc => {
    const desc =
      `[Preconditions]\n${tc.preconditions}\n\n[Steps]\n${tc.testSteps}\n\n[Test Data]\n${tc.testData}\n\n[Expected Result]\n${tc.expectedResult}`;
    return [
      tc.testCaseId,
      tc.summary,
      tc.priority,
      `Test Case (${tc.testType})`,
      'Open',
      tc.component,
      tc.labels,
      desc,
      tc.testEnvironment,
      tc.sprint,
      tc.assignee,
      tc.createdDate,
      tc.comments,
    ];
  });

  triggerDownload(filename, buildCSV(headers, rows));
}

/* ── Generic CSV — all 23 template fields ─────────────────────── */
export function exportToGenericCSV(testCases, filename = `TestCases_Generic_${stamp()}.csv`) {
  const headers = [
    'Test Case ID', 'Linked Story/Epic Key', 'Summary',
    'Test Type', 'Execution Type', 'Priority', 'Severity',
    'Component', 'Labels', 'Preconditions',
    'Test Steps', 'Test Data', 'Expected Result',
    'Actual Result', 'Status', 'Assignee', 'Reporter',
    'Sprint', 'Test Environment', 'Created Date',
    'Executed Date', 'Defect ID', 'Comments/Notes',
  ];

  const rows = testCases.map(tc => [
    tc.testCaseId,
    tc.linkedStoryKey,
    tc.summary,
    tc.testType,
    tc.executionType,
    tc.priority,
    tc.severity,
    tc.component,
    tc.labels,
    tc.preconditions,
    tc.testSteps,
    tc.testData,
    tc.expectedResult,
    tc.actualResult,
    tc.status,
    tc.assignee,
    tc.reporter,
    tc.sprint,
    tc.testEnvironment,
    tc.createdDate,
    tc.executedDate,
    tc.defectId,
    tc.comments,
  ]);

  triggerDownload(filename, buildCSV(headers, rows));
}

/* ── JSON ─────────────────────────────────────────────────────── */
export function exportToJSON(testCases, filename = `TestCases_${stamp()}.json`) {
  const content = JSON.stringify(testCases, null, 2);
  triggerDownload(filename, content, 'application/json');
}

/* ── Markdown ─────────────────────────────────────────────────── */
export function exportToMarkdown(testCases, productName = 'Product', filename = `TestCases_${stamp()}.md`) {
  const lines = [
    `# Test Cases — ${productName}`,
    `> Generated by B.L.A.S.T. Framework on ${stamp()}`,
    `> Total: **${testCases.length} test cases**`,
    '',
    '---',
    '',
  ];

  testCases.forEach((tc, i) => {
    lines.push(`## ${i + 1}. ${tc.testCaseId} — ${tc.summary}`);
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| **Test Type** | ${tc.testType} |`);
    lines.push(`| **Execution Type** | ${tc.executionType} |`);
    lines.push(`| **Priority** | ${tc.priority} |`);
    lines.push(`| **Severity** | ${tc.severity} |`);
    lines.push(`| **Component** | ${tc.component} |`);
    lines.push(`| **Labels** | ${tc.labels} |`);
    lines.push(`| **Environment** | ${tc.testEnvironment} |`);
    lines.push(`| **Linked Story** | ${tc.linkedStoryKey} |`);
    lines.push(`| **Sprint** | ${tc.sprint} |`);
    lines.push(`| **Created** | ${tc.createdDate} |`);
    lines.push('');
    lines.push('**Preconditions:**');
    lines.push(tc.preconditions || '_None_');
    lines.push('');
    lines.push('**Test Steps:**');
    (tc.testSteps || '').split('\n').filter(Boolean).forEach(step => lines.push(`- ${step}`));
    lines.push('');
    lines.push(`**Test Data:** \`${tc.testData || 'N/A'}\``);
    lines.push('');
    lines.push(`**Expected Result:** ${tc.expectedResult}`);
    if (tc.comments) {
      lines.push('');
      lines.push(`_Notes: ${tc.comments}_`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  triggerDownload(filename, lines.join('\n'), 'text/markdown;charset=utf-8;');
}

/* ── Excel (.xlsx) — 6-sheet workbook per testcases_template.md §5 ── */
export function exportToExcel(testCases, productName = 'Product', filename = `TestCases_${stamp()}.xlsx`) {
  const wb = XLSX.utils.book_new();

  /* helper: build a sheet, set col widths, freeze row 1 */
  const makeSheet = (headers, rows, colWidths) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = colWidths
      ? colWidths.map(w => ({ wch: w }))
      : headers.map(h => ({ wch: Math.min(50, Math.max(14, h.length + 4)) }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    return ws;
  };

  /* ── Sheet 1: Test Cases — all 23 fields ── */
  const allHeaders = [
    'Test Case ID', 'Linked Story/Epic Key', 'Summary',
    'Test Type', 'Execution Type', 'Priority', 'Severity',
    'Component', 'Labels', 'Preconditions',
    'Test Steps', 'Test Data', 'Expected Result',
    'Actual Result', 'Status', 'Assignee', 'Reporter',
    'Sprint', 'Test Environment', 'Created Date',
    'Executed Date', 'Defect ID', 'Comments/Notes',
  ];
  const allColWidths = [16,22,45,16,16,12,12,18,22,35,40,30,40,30,14,18,18,12,18,14,14,14,35];
  const allRows = testCases.map(tc => [
    tc.testCaseId, tc.linkedStoryKey, tc.summary,
    tc.testType, tc.executionType, tc.priority, tc.severity,
    tc.component, tc.labels, tc.preconditions,
    tc.testSteps, tc.testData, tc.expectedResult,
    tc.actualResult, tc.status, tc.assignee, tc.reporter,
    tc.sprint, tc.testEnvironment, tc.createdDate,
    tc.executedDate, tc.defectId, tc.comments,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(allHeaders, allRows, allColWidths), 'Test Cases');

  /* ── Sheet 2: Field Dictionary (template §5 requirement) ── */
  const dictHeaders = ['#', 'Column Name', 'Definition', 'Data Type', 'Required', 'JIRA Field', 'Xray Field', 'Zephyr Scale'];
  const dictRows = [
    [1,'Test Case ID','Unique identifier for traceability','Text (TC-XXX-###)','Yes','Issue Key','Test Issue Key','Test Case Key'],
    [2,'Linked Story/Epic Key','JIRA key of user story or epic','Text','Yes','Linked Issues','Test Coverage / Requirement Link','Linked Issue'],
    [3,'Summary','One-line test objective','Text','Yes','Summary','Test Summary','Test Name'],
    [4,'Test Type','Category of testing','Dropdown','Yes','Custom: Test Type','Test Type','Test Type'],
    [5,'Execution Type','Manual or automated execution','Dropdown','Yes','Custom: Execution Type','Test Execution Type','Automation Status'],
    [6,'Priority','Business priority','Dropdown','Yes','Priority','Priority','Priority'],
    [7,'Severity','Impact level if feature fails','Dropdown','Yes','Custom: Severity','Severity','Severity'],
    [8,'Component','Application module under test','Text/Dropdown','Yes','Component/s','Component','Component'],
    [9,'Labels','Filter/grouping tags','Text, comma-sep','No','Labels','Labels','Labels'],
    [10,'Preconditions','Setup required before execution','Multi-line text','Yes','Description (precondition)','Precondition','Precondition'],
    [11,'Test Steps','Sequential numbered actions','Multi-line text','Yes','Description / Steps','Test Step','Test Step'],
    [12,'Test Data','Specific input values','Text','Yes','Description (data)','Test Data','Test Data'],
    [13,'Expected Result','Anticipated system behaviour','Text','Yes','Description (expected)','Expected Result','Expected Result'],
    [14,'Actual Result','Observed behaviour during execution','Text','Post-execution','Execution comment','Actual Result','Actual Result'],
    [15,'Status','Current execution status','Dropdown','Yes','Status','Test Run Status','Execution Status'],
    [16,'Assignee','Executor of the test','Text/User','Yes','Assignee','Assignee','Assignee'],
    [17,'Reporter','Test case author','Text/User','Yes','Reporter','Reporter','Created By'],
    [18,'Sprint','Sprint of execution','Text','No','Sprint','Sprint','Sprint'],
    [19,'Test Environment','Execution environment','Text/Dropdown','Yes','Custom: Environment','Test Environment','Environment'],
    [20,'Created Date','Date authored (YYYY-MM-DD)','Date','Auto/Yes','Created','Created Date','Created On'],
    [21,'Executed Date','Date last run (YYYY-MM-DD)','Date','Conditional','Custom field','Last Executed','Executed On'],
    [22,'Defect ID','Linked bug key if failed','Text','Conditional','Linked Issues','Defects (linked)','Linked Defect'],
    [23,'Comments/Notes','Additional context or caveats','Text','No','Comment','Comment','Comments'],
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(dictHeaders, dictRows, [4,24,45,20,12,28,28,22]), 'Field Dictionary');

  /* ── Sheet 3: Lookup Lists (template §5 requirement) ── */
  const lookupData = [
    ['Priority', '', 'Severity', '', 'Test Type', '', 'Execution Type', '', 'Status'],
    ['Critical', '', 'Critical', '', 'Functional', '', 'Manual', '', 'Not Executed'],
    ['High',     '', 'Major',    '', 'Regression', '', 'Automated', '', 'In Progress'],
    ['Medium',   '', 'Minor',    '', 'Smoke',      '', '', '', 'Pass'],
    ['Low',      '', 'Trivial',  '', 'Integration', '', '', '', 'Fail'],
    ['', '', '', '', 'UAT', '', '', '', 'Blocked'],
    ['', '', '', '', 'Performance', '', '', '', 'Deferred'],
    ['', '', '', '', 'Security', '', '', '', ''],
    ['', '', '', '', 'Exploratory', '', '', '', ''],
    ['', '', '', '', 'Negative', '', '', '', ''],
    ['', '', '', '', 'Boundary', '', '', '', ''],
    ['', '', '', '', 'Accessibility', '', '', '', ''],
  ];
  const wsLookup = XLSX.utils.aoa_to_sheet(lookupData);
  wsLookup['!cols'] = [14,4,14,4,16,4,16,4,16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsLookup, 'Lookup Lists');

  /* ── Sheet 4: JIRA Import ── */
  const jiraHeaders = ['Summary','Issue Type','Priority','Component/s','Labels','Description','Reporter','Assignee','Sprint','Environment'];
  const jiraRows = testCases.map(tc => [
    `${tc.testCaseId}: ${tc.summary}`, 'Test', tc.priority, tc.component, tc.labels,
    `PRECONDITIONS:\n${tc.preconditions}\n\nSTEPS:\n${tc.testSteps}\n\nTEST DATA:\n${tc.testData}\n\nEXPECTED:\n${tc.expectedResult}`,
    tc.reporter, tc.assignee, tc.sprint, tc.testEnvironment,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(jiraHeaders, jiraRows), 'JIRA Import');

  /* ── Sheet 5: XRay Import ── */
  const xrayHeaders = ['Test Case ID','Summary','Test Type','Execution Type','Priority','Severity','Component','Labels','Precondition','Test Steps','Test Data','Expected Result','Reporter','Assignee','Sprint','Environment','Created Date','Linked Story/Epic Key','Comments'];
  const xrayRows = testCases.map(tc => [
    tc.testCaseId, tc.summary, tc.testType, tc.executionType,
    tc.priority, tc.severity, tc.component, tc.labels,
    tc.preconditions, tc.testSteps, tc.testData, tc.expectedResult,
    tc.reporter, tc.assignee, tc.sprint, tc.testEnvironment,
    tc.createdDate, tc.linkedStoryKey, tc.comments,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(xrayHeaders, xrayRows), 'XRay Import');

  /* ── Sheet 6: YouTrack Import ── */
  const ytHeaders = ['ID','Summary','Priority','Type','State','Subsystem','Tags','Description','Environment','Sprint','Assignee','Created'];
  const ytRows = testCases.map(tc => [
    tc.testCaseId, tc.summary, tc.priority, `Test Case (${tc.testType})`,
    'Open', tc.component, tc.labels,
    `[Preconditions]\n${tc.preconditions}\n\n[Steps]\n${tc.testSteps}\n\n[Expected]\n${tc.expectedResult}`,
    tc.testEnvironment, tc.sprint, tc.assignee, tc.createdDate,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(ytHeaders, ytRows), 'YouTrack Import');

  XLSX.writeFile(wb, filename);
}

/* ── Master export dispatcher ─────────────────────────────────── */
export function exportTestCases({ testCases, tool, format, productName }) {
  const base = productName ? `${productName.replace(/\s+/g, '_')}_` : '';
  const date = stamp();

  if (format === 'json') {
    exportToJSON(testCases, `${base}TestCases_${date}.json`);
    return;
  }
  if (format === 'markdown') {
    exportToMarkdown(testCases, productName, `${base}TestCases_${date}.md`);
    return;
  }
  if (format === 'excel') {
    exportToExcel(testCases, productName, `${base}TestCases_${date}.xlsx`);
    return;
  }

  // CSV — route by tool
  switch (tool) {
    case 'xray':
      exportToXRay(testCases, `${base}XRay_${date}.csv`);
      break;
    case 'zephyr':
      exportToZephyr(testCases, `${base}Zephyr_${date}.csv`);
      break;
    case 'youtrack':
      exportToYouTrack(testCases, `${base}YouTrack_${date}.csv`);
      break;
    case 'jira':
      exportToJIRA(testCases, `${base}JIRA_${date}.csv`);
      break;
    default:
      exportToGenericCSV(testCases, `${base}TestCases_Generic_${date}.csv`);
  }
}
