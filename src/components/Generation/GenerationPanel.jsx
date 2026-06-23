/**
 * GenerationPanel.jsx
 * B.L.A.S.T. Framework — Enterprise Test Plan Generator
 * Input: PRD · User Story · Feature Description · Acceptance Criteria
 */

import React, { useState, useRef } from 'react';
import { useConfig } from '../../context/ConfigContext';
import TestPlanGenerator from '../../services/testPlanGenerator';
import TestPlanDisplay from './TestPlanDisplay';
import LoadingSpinner from '../LoadingSpinner';
import '../styles/GenerationPanel.css';

const PRODUCT_TYPES = [
  'Web Application (SaaS)',
  'Mobile Application (iOS/Android)',
  'Desktop Software',
  'Enterprise / Workflow Software',
  'REST API / Backend Service',
  'E-Commerce Platform',
  'FinTech / Banking Application',
  'Healthcare / MedTech Platform',
  'IoT / Hardware Device',
  'Multi-platform Product',
];

const INPUT_TYPES = [
  {
    id: 'prd',
    icon: '📄',
    label: 'PRD',
    sublabel: 'Product Requirements Doc',
    placeholder: `Paste your Product Requirements Document here.\n\nExample:\n"The payment gateway must support Stripe and PayPal checkout. Users must be able to pay with credit/debit cards and digital wallets. The system must be PCI-DSS Level 1 compliant. Transactions must complete within 3 seconds. Failed payments must retry up to 3 times..."`,
  },
  {
    id: 'userstory',
    icon: '🧑‍💻',
    label: 'User Story',
    sublabel: 'As a user, I want…',
    placeholder: `Paste one or more User Stories here.\n\nExample:\nAs a registered user, I want to log in using my email and password so that I can access my dashboard.\n\nAcceptance Criteria:\n- Given valid credentials, when I click Sign In, then I am redirected to the dashboard\n- Given invalid credentials, when I click Sign In, then an error message is shown\n- Given 5 failed attempts, then my account is locked for 15 minutes`,
  },
  {
    id: 'feature',
    icon: '🧩',
    label: 'Feature',
    sublabel: 'Feature specification',
    placeholder: `Describe the feature or paste your feature specification here.\n\nExample:\n"Search & Filter Module — Users can search the product catalogue by keyword, category, price range, and rating. Results must appear within 500ms. Filters must be combinable. Zero-result states must show suggestions. Search terms must be sanitised to prevent XSS. Pagination: 20 results per page with infinite scroll option..."`,
  },
  {
    id: 'acceptance',
    icon: '✅',
    label: 'Acceptance Criteria',
    sublabel: 'Definition of Done',
    placeholder: `Paste your Acceptance Criteria / Definition of Done here.\n\nExample:\n- User can register with email and password\n- Password must be minimum 12 characters with uppercase, lowercase, number, and special character\n- Email verification link must be sent within 30 seconds of registration\n- Duplicate email registrations must return a clear error message\n- Registration form must be accessible (WCAG 2.1 AA)\n- All inputs must be sanitised against XSS and SQL injection`,
  },
];

export default function GenerationPanel() {
  const { config } = useConfig();

  const [inputTypeId, setInputTypeId] = useState('prd');
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [productVersion, setProductVersion] = useState('1.0');
  const [requirements, setRequirements] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [testPlan, setTestPlan] = useState(null);
  const [error, setError] = useState('');
  const [attachedDoc, setAttachedDoc] = useState(null);
  const docRef = useRef(null);

  const activeInputType = INPUT_TYPES.find((t) => t.id === inputTypeId);

  const handleDocFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedDoc({ name: file.name, content: ev.target.result, size: file.size });
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setTestPlan(null);
    setLoading(true);

    try {
      if (!config?.groq?.apiKey) {
        throw new Error('GROQ API key not configured. Please go to Settings and enter your GROQ API key.');
      }
      if (!productName.trim()) throw new Error('Please enter a product or feature name.');
      if (!requirements.trim()) throw new Error('Please paste your requirements, user story, or feature description.');

      const generator = new TestPlanGenerator(config.groq.apiKey, config.groq.model);

      setLoadingStage('Analysing requirements...');
      const fullReqs = requirements.trim() +
        (attachedDoc ? `\n\n--- ATTACHED DOCUMENT: ${attachedDoc.name} ---\n${attachedDoc.content}` : '');

      const input = {
        productName: productName.trim(),
        requirements: fullReqs,
        productType,
        version: productVersion.trim() || '1.0',
        inputType: inputTypeId,
      };

      setLoadingStage('Generating enterprise test plan with AI...');
      const result = await generator.generateTestPlan(input);
      if (!result.success) throw new Error(result.error);

      setTestPlan(result.testPlan);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const isGroqConfigured = !!config?.groq?.apiKey;

  return (
    <div className="generation-panel">

      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">AI Quality Intelligence</div>
          <h2 className="hero-title">Enterprise Test Plan Generator</h2>
          <p className="hero-subtitle">
            AI-powered test planning by a virtual Lead Quality Architect.
            Paste your PRD, user story, feature spec, or acceptance criteria — get a full IEEE 829 test plan in seconds.
          </p>
          <div className="hero-stats">
            <div className="hero-stat"><span className="stat-num">58+</span><span className="stat-label">Test Cases</span></div>
            <div className="hero-stat"><span className="stat-num">13</span><span className="stat-label">Plan Sections</span></div>
            <div className="hero-stat"><span className="stat-num">6</span><span className="stat-label">Test Types</span></div>
            <div className="hero-stat"><span className="stat-num">OWASP</span><span className="stat-label">Top 10 Coverage</span></div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="form-card">

        {/* Input Type Selector */}
        <div className="input-type-header">
          <span className="input-type-label">What are you providing?</span>
        </div>
        <div className="input-type-group">
          {INPUT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`input-type-btn ${inputTypeId === t.id ? 'active' : ''}`}
              onClick={() => setInputTypeId(t.id)}
            >
              <span className="input-type-icon">{t.icon}</span>
              <div className="input-type-text">
                <strong>{t.label}</strong>
                <small>{t.sublabel}</small>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleGenerate} className="generation-form">

          {/* Product Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Product / Application Type</label>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className="form-select">
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <small>Tailors test approach, tools, and scenarios for your product category</small>
            </div>
          </div>

          {/* Product Name + Version */}
          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="productName">Product / Feature Name <span className="required">*</span></label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., User Authentication Module"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="productVersion">Version / Release</label>
              <input
                id="productVersion"
                type="text"
                value={productVersion}
                onChange={(e) => setProductVersion(e.target.value)}
                placeholder="e.g., 2.4.1"
              />
            </div>
          </div>

          {/* Requirements Textarea */}
          <div className="form-group">
            <label htmlFor="requirements">
              {activeInputType?.label} Content <span className="required">*</span>
              <span className="label-hint">
                {inputTypeId === 'prd'        && 'Paste your full PRD or feature requirements document'}
                {inputTypeId === 'userstory'  && 'Paste one or more user stories with acceptance criteria'}
                {inputTypeId === 'feature'    && 'Describe the feature or paste your feature specification'}
                {inputTypeId === 'acceptance' && 'Paste your acceptance criteria or Definition of Done checklist'}
              </span>
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={activeInputType?.placeholder}
              rows={9}
              required
            />
            <small>
              {requirements.length} characters
              {requirements.length < 100 && requirements.length > 0 && ' — add more detail for richer test cases'}
              {requirements.length >= 100 && ' — the more detail you provide, the more specific the test plan'}
            </small>
          </div>

          {/* Document attachment */}
          <div className="doc-attach-row">
            <button type="button" className="doc-attach-btn" onClick={() => docRef.current?.click()}>
              📎 Attach Document
            </button>
            <span className="doc-attach-hint">.txt · .md · .json · .xml · .yaml · .csv · .feature</span>
            {attachedDoc && (
              <span className="doc-chip">
                📄 {attachedDoc.name}
                <button type="button" className="doc-chip-remove" onClick={() => setAttachedDoc(null)}>✕</button>
              </span>
            )}
          </div>
          <input ref={docRef} type="file" accept=".txt,.md,.json,.xml,.yaml,.yml,.csv,.log,.feature,.properties,.conf,.ts,.js" style={{ display: 'none' }} onChange={handleDocFile} />

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>Generation Failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!isGroqConfigured && (
            <div className="warning-banner">
              <span>🔑</span>
              <div>
                <strong>GROQ API Key Required</strong>
                <p>Go to Settings to configure your GROQ API key. Free at console.groq.com</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="generate-btn"
            disabled={loading || !isGroqConfigured}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                {loadingStage || 'Generating...'}
              </>
            ) : (
              <>
                <span>⚡</span>
                Generate Enterprise Test Plan
              </>
            )}
          </button>
        </form>

        {loading && (
          <div className="loading-overlay">
            <LoadingSpinner />
            <p className="loading-stage">{loadingStage}</p>
            <p className="loading-hint">Generating 58+ test cases across 6 categories...</p>
          </div>
        )}
      </div>

      {testPlan && <TestPlanDisplay testPlan={testPlan} />}
    </div>
  );
}
