/**
 * App.jsx
 * Main application component
 */

import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { ConfigProvider, useConfig } from '../context/ConfigContext';
import { NotificationProvider } from '../context/NotificationContext';
import Header from './Layout/Header';
import Sidebar from './Layout/Sidebar';
import MainContainer from './Layout/MainContainer';
import ToastContainer from './Toast/ToastContainer';
import SettingsPanel from './Settings/SettingsPanel';
import GenerationPanel from './Generation/GenerationPanel';
import TestCaseGenerator from './TestCases/TestCaseGenerator';
import TestStrategyGeneratorPanel from './TestStrategy/TestStrategyGenerator';
import TestMetricsGenerator from './TestMetrics/TestMetricsGenerator';
import DefectRadarPanel from './DefectRadar/DefectRadarPanel';
import APIContractForgePanel from './APIContractForge/APIContractForgePanel';
import TestCodeGenPanel from './TestCodeGen/TestCodeGenPanel';
import FrameworkForgePanel from './FrameworkForge/FrameworkForgePanel';
import './App.css';

/**
 * AppContent component (inside providers)
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState('generation');
  const { isValidated } = useConfig();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = saved ? saved === 'dark' : prefersDark;
    setIsDarkMode(darkMode);
    applyTheme(darkMode);
  }, []);

  // Apply theme
  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    applyTheme(newMode);
  };

  const renderContent = () => {
    if (!isValidated || activeTab === 'settings') {
      return <SettingsPanel onConfigSaved={() => setActiveTab('generation')} />;
    }
    if (activeTab === 'testcases') return <TestCaseGenerator />;
    if (activeTab === 'strategy')  return <TestStrategyGeneratorPanel />;
    if (activeTab === 'metrics')   return <TestMetricsGenerator />;
    if (activeTab === 'defect')    return <DefectRadarPanel />;
    if (activeTab === 'apiforge')  return <APIContractForgePanel />;
    if (activeTab === 'codegen')    return <TestCodeGenPanel />;
    if (activeTab === 'framework')  return <FrameworkForgePanel />;
    return <GenerationPanel />;
  };

  return (
    <div className="app">
      <ErrorBoundary>
        <Header isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
        <div className="app-layout">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <MainContainer>
            {renderContent()}
          </MainContainer>
        </div>
        <ToastContainer />
      </ErrorBoundary>
    </div>
  );
}

/**
 * App component
 * Root component with providers
 */
export default function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ConfigProvider>
          <AppContent />
        </ConfigProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}
