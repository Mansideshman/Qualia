import React from 'react';
import '../styles/Sidebar.css';

const NAV_ITEMS = [
  { id: 'qabuddy',    icon: '🤖', label: 'QA Buddy',            desc: 'Your AI QA mentor'          },
  { id: 'generation', icon: '⚡', label: 'Test Intelligence',   desc: 'Strategic test plans'       },
  { id: 'testcases',  icon: '🧪', label: 'Scenario Forge',      desc: 'Precision test cases'       },
  { id: 'strategy',   icon: '📐', label: 'Test Blueprint',      desc: 'Multi-dimension strategy'   },
  { id: 'metrics',    icon: '📊', label: 'Release Confidence',  desc: 'Metrics & reporting'        },
  { id: 'defect',     icon: '🔍', label: 'Defect Radar',        desc: 'AI bug detection'           },
  { id: 'apiforge',   icon: '🔗', label: 'API Contract Forge',  desc: 'OpenAPI → test suite'       },
  { id: 'codegen',    icon: '🎭', label: 'Test Code Generator', desc: 'Playwright / Cypress / Selenium' },
  { id: 'framework',  icon: '🏗️', label: 'Framework Forge',     desc: 'Full E2E framework generator'   },
  { id: 'settings',   icon: '⚙️', label: 'Settings',            desc: 'API configuration'          },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''} ${item.comingSoon ? 'nav-item-soon' : ''}`}
            onClick={() => !item.comingSoon && onTabChange(item.id)}
            title={item.comingSoon ? 'Coming Soon' : item.label}
            disabled={item.comingSoon}
          >
            <span className="nav-icon">{item.icon}</span>
            <div className="nav-text">
              <span className="nav-label">
                {item.label}
                {item.comingSoon && <span className="nav-soon-chip">Soon</span>}
              </span>
              <span className="nav-desc">{item.desc}</span>
            </div>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-version">
          <span>QUALIA</span>
          <span>v2.0</span>
        </div>
      </div>
    </aside>
  );
}
