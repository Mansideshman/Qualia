/**
 * setupProxy.js
 * Automatically loaded by Create React App
 * Proxies /api/jira calls to JIRA, bypassing CORS
 */

module.exports = function(app) {
  // We'll use simple fetch with proper headers instead
  // CRA doesn't auto-load http-proxy-middleware without explicit install
  // So we'll modify jiraClient to bypass CORS differently
  console.log('setupProxy.js loaded');
};
