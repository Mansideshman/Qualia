/**
 * ConfigContext.jsx
 * Global configuration context — JIRA optional, GROQ required
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const VALID_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function normaliseModel(model) {
  return VALID_MODELS.includes(model) ? model : DEFAULT_MODEL;
}

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [config, setConfigState] = useState({
    jira: { baseUrl: '', email: '', token: '' },
    groq: { apiKey: '', model: DEFAULT_MODEL },
  });

  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('blast_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.groq) {
          parsed.groq.model = normaliseModel(parsed.groq.model);
        }
        setConfigState(parsed);
        if (parsed.groq?.apiKey) setIsValidated(true);
        return;
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }

    // Try env variables (REACT_APP_ prefix for CRA)
    const envConfig = {
      jira: {
        baseUrl: process.env.REACT_APP_JIRA_BASE_URL || '',
        email: process.env.REACT_APP_JIRA_EMAIL || '',
        token: process.env.REACT_APP_JIRA_API_TOKEN || '',
      },
      groq: {
        apiKey: process.env.REACT_APP_GROQ_API_KEY || '',
        model: DEFAULT_MODEL, // Always use a valid model — ignore env model value
      },
    };

    if (envConfig.groq.apiKey) {
      setConfigState(envConfig);
      setIsValidated(true);
    }
  }, []);

  const updateJiraConfig = (field, value) => {
    setConfigState((prev) => ({ ...prev, jira: { ...prev.jira, [field]: value } }));
  };

  const updateGroqConfig = (field, value) => {
    setConfigState((prev) => ({ ...prev, groq: { ...prev.groq, [field]: value } }));
  };

  const saveConfig = () => {
    const toSave = {
      ...config,
      groq: { ...config.groq, model: normaliseModel(config.groq?.model) },
    };
    localStorage.setItem('blast_config', JSON.stringify(toSave));
    setConfigState(toSave);
    if (toSave.groq?.apiKey) setIsValidated(true);
  };

  const clearConfig = () => {
    setConfigState({ jira: { baseUrl: '', email: '', token: '' }, groq: { apiKey: '', model: 'llama-3.3-70b-versatile' } });
    setIsValidated(false);
    localStorage.removeItem('blast_config');
  };

  return (
    <ConfigContext.Provider value={{ config, isValidated, updateJiraConfig, updateGroqConfig, saveConfig, clearConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
