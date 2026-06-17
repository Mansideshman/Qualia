/**
 * SettingsPanel.jsx
 * GROQ is required. Jira is optional (issue-key mode only).
 * Bug tracker push (Jira/YouTrack/Linear/GitHub) is configured per-use in Defect Radar.
 */

import React, { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import JiraClient from '../../services/jiraClient';
import TestPlanGenerator, { VALID_GROQ_MODELS } from '../../services/testPlanGenerator';
import '../styles/SettingsPanel.css';

const GROQ_MODEL_OPTIONS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Recommended)', desc: 'Best quality, most comprehensive test plans' },
  { value: 'llama3-70b-8192',         label: 'Llama 3 70B',                             desc: 'Fast and capable, good for most plans' },
  { value: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B 32K',                        desc: 'Long context window, good for detailed PRDs' },
  { value: 'llama3-8b-8192',          label: 'Llama 3 8B (Fastest)',                    desc: 'Quickest responses, lighter test plans' },
  { value: 'gemma2-9b-it',            label: 'Gemma 2 9B',                              desc: 'Google model, good alternative' },
];

export default function SettingsPanel({ onConfigSaved }) {
  const { config, updateJiraConfig, updateGroqConfig, saveConfig } = useConfig();

  const [formData, setFormData] = useState({
    jiraBaseUrl:   '',
    jiraEmail:     '',
    jiraApiToken:  '',
    groqApiKey:    '',
    groqModel:     'llama-3.3-70b-versatile',
  });

  const [loading, setLoading]   = useState(false);
  const [testing, setTesting]   = useState({ jira: false, groq: false });
  const [results, setResults]   = useState({ jira: null, groq: null });
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    if (config) {
      const model = config.groq?.model;
      setFormData({
        jiraBaseUrl:  config.jira?.baseUrl || '',
        jiraEmail:    config.jira?.email   || '',
        jiraApiToken: config.jira?.token   || '',
        groqApiKey:   config.groq?.apiKey  || '',
        groqModel:    VALID_GROQ_MODELS.includes(model) ? model : 'llama-3.3-70b-versatile',
      });
    }
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* ── Test GROQ ── */
  const testGroq = async () => {
    setTesting(t => ({ ...t, groq: true }));
    setResults(r => ({ ...r, groq: null }));
    try {
      const gen    = new TestPlanGenerator(formData.groqApiKey, formData.groqModel);
      const result = await gen.validateApiKey();
      setResults(r => ({ ...r, groq: result }));
    } catch (e) {
      setResults(r => ({ ...r, groq: { isValid: false, error: e.message } }));
    } finally {
      setTesting(t => ({ ...t, groq: false }));
    }
  };

  /* ── Test Jira ── */
  const testJira = async () => {
    setTesting(t => ({ ...t, jira: true }));
    setResults(r => ({ ...r, jira: null }));
    try {
      const client = new JiraClient(formData.jiraBaseUrl, formData.jiraEmail, formData.jiraApiToken);
      const result = await client.validateCredentials();
      setResults(r => ({ ...r, jira: result }));
    } catch (e) {
      setResults(r => ({ ...r, jira: { isValid: false, error: e.message } }));
    } finally {
      setTesting(t => ({ ...t, jira: false }));
    }
  };

  /* ── Save ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!formData.groqApiKey) throw new Error('GROQ API key is required. Get yours free at console.groq.com');

      updateGroqConfig('apiKey', formData.groqApiKey);
      updateGroqConfig('model', formData.groqModel || 'llama-3.3-70b-versatile');

      if (formData.jiraBaseUrl) {
        updateJiraConfig('baseUrl', formData.jiraBaseUrl);
        updateJiraConfig('email',   formData.jiraEmail);
        updateJiraConfig('token',   formData.jiraApiToken);
      }

      saveConfig();
      setSuccess('Configuration saved successfully!');
      setTimeout(() => { if (onConfigSaved) onConfigSaved(); }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const jiraTestable = formData.jiraBaseUrl && formData.jiraEmail && formData.jiraApiToken;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>API Configuration</h2>
        <p>Configure your AI engine and optional tracker integrations. GROQ is the only required setting.</p>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">

        {/* ── GROQ — REQUIRED ── */}
        <div className="form-section required-section">
          <div className="section-header">
            <h3>GROQ AI</h3>
            <span className="section-badge required-badge">Required</span>
          </div>
          <p className="section-desc">
            Powers all AI generation (test cases, strategy, defect analysis). Free API key at{' '}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a>
          </p>

          <div className="form-group">
            <label htmlFor="groqApiKey">API Key <span className="required">*</span></label>
            <div className="input-with-btn">
              <input
                type="password"
                id="groqApiKey"
                name="groqApiKey"
                value={formData.groqApiKey}
                onChange={handleChange}
                placeholder="gsk_..."
                autoComplete="off"
              />
              <button
                type="button"
                className="test-inline-btn"
                onClick={testGroq}
                disabled={!formData.groqApiKey || testing.groq}
              >
                {testing.groq ? 'Testing…' : 'Test'}
              </button>
            </div>
            {results.groq && (
              <div className={`connection-result ${results.groq.isValid ? 'success' : 'error'}`}>
                {results.groq.isValid
                  ? '✅ GROQ connected successfully'
                  : `❌ ${results.groq.error}`}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="groqModel">AI Model</label>
            <select id="groqModel" name="groqModel" value={formData.groqModel} onChange={handleChange} className="form-select">
              {GROQ_MODEL_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <small>
              {GROQ_MODEL_OPTIONS.find(m => m.value === formData.groqModel)?.desc || ''}
            </small>
          </div>
        </div>

        {/* ── JIRA — OPTIONAL ── */}
        <div className="form-section optional-section">
          <div className="section-header">
            <h3>Jira Cloud</h3>
            <span className="section-badge optional-badge">Optional</span>
          </div>
          <p className="section-desc">
            Used when generating from an <strong>Issue / Tracker Key</strong> in Test Cases or Test Strategy.
            Leave blank to use PRD / Requirements text mode instead.
          </p>

          {/* CORS notice */}
          <div className="settings-info-banner">
            <span className="info-icon">ℹ️</span>
            <div>
              <strong>Browser CORS limitation</strong>
              <p>
                Jira Cloud may block direct browser requests due to CORS policy — this is a browser security
                restriction, not a credentials problem. If the connection test fails with a CORS or HTML error,
                your credentials are still saved and valid. To push tickets to Jira, use the{' '}
                <strong>Defect Radar → Push to Tracker</strong> panel or export as JSON and import via Jira's
                bulk import.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="jiraBaseUrl">Base URL</label>
            <input
              type="url"
              id="jiraBaseUrl"
              name="jiraBaseUrl"
              value={formData.jiraBaseUrl}
              onChange={handleChange}
              placeholder="https://your-domain.atlassian.net"
              autoComplete="off"
            />
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="jiraEmail">Email</label>
              <input
                type="email"
                id="jiraEmail"
                name="jiraEmail"
                value={formData.jiraEmail}
                onChange={handleChange}
                placeholder="you@company.com"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="jiraApiToken">API Token</label>
              <div className="input-with-btn">
                <input
                  type="password"
                  id="jiraApiToken"
                  name="jiraApiToken"
                  value={formData.jiraApiToken}
                  onChange={handleChange}
                  placeholder="Paste Atlassian API token"
                  autoComplete="off"
                />
              </div>
              <small>
                Generate at{' '}
                <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">
                  id.atlassian.com → Security → API tokens
                </a>
              </small>
            </div>
          </div>

          <button
            type="button"
            className="test-jira-btn"
            onClick={testJira}
            disabled={!jiraTestable || testing.jira}
          >
            {testing.jira ? '🔄 Testing…' : '🔌 Test Jira Connection'}
          </button>

          {results.jira && (
            <div className={`connection-result ${results.jira.isValid ? 'success' : 'error'}`}>
              {results.jira.isValid
                ? `✅ Jira connected — logged in as ${results.jira.user || results.jira.email || 'user'}`
                : `❌ ${results.jira.error}`}
            </div>
          )}
        </div>

        {/* ── Other trackers note ── */}
        <div className="form-section info-section">
          <div className="section-header">
            <h3>YouTrack · Linear · GitHub Issues</h3>
            <span className="section-badge info-badge">Configured per use</span>
          </div>
          <p className="section-desc">
            YouTrack, Linear, and GitHub Issues integrations are configured directly in{' '}
            <strong>Defect Radar</strong> when pushing tickets. Credentials are saved automatically to
            your browser's local storage — no need to set them here.
          </p>
        </div>

        {error   && <div className="settings-error"><strong>Error:</strong> {error}</div>}
        {success && <div className="settings-success">✅ {success}</div>}

        <div className="settings-actions">
          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? '💾 Saving…' : '💾 Save Configuration'}
          </button>
        </div>
      </form>

      {/* Help */}
      <div className="settings-help">
        <h4>Quick Setup Guide</h4>
        <ol>
          <li>Get a free GROQ API key at <strong>console.groq.com</strong></li>
          <li>Paste it above, click <strong>Test</strong> to verify, then click <strong>Save</strong></li>
          <li>Go to <strong>Test Cases</strong> or <strong>Test Strategy</strong> — use PRD mode (no Jira needed)</li>
          <li>To push bugs to a tracker, go to <strong>Defect Radar</strong> → analyse → <strong>Push to Tracker</strong></li>
        </ol>
      </div>
    </div>
  );
}
