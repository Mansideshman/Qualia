import React from 'react';
import '../styles/Header.css';

export default function Header({ isDarkMode, onToggleDarkMode }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <div className="brand-logo">
              <span className="logo-q">Q</span>
              <span className="logo-u">U</span>
              <span className="logo-a1">A</span>
              <span className="logo-l">L</span>
              <span className="logo-i">I</span>
              <span className="logo-a2">A</span>
            </div>
            <div className="brand-text">
              <h1>QUALIA</h1>
              <p className="brand-tagline">AI Software Quality Intelligence</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-badges">
            <span className="header-badge ai-badge">AI-Powered</span>
            <span className="header-badge platform-badge">Quality Intelligence</span>
          </div>
          <button className="theme-toggle" onClick={onToggleDarkMode} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label="Toggle theme">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
