/**
 * TypeBadge.jsx
 * Issue type badge component
 */

import React from 'react';
import './Badge.css';

/**
 * TypeBadge component
 * @param {Object} props - Component props
 * @param {string} props.type - Issue type (Bug, Feature, Task, etc.)
 */
export default function TypeBadge({ type }) {
  if (!type) return null;

  const typeMap = {
    'Bug': 'type-bug',
    'Feature': 'type-feature',
    'Task': 'type-task',
    'Story': 'type-feature',
    'Epic': 'type-feature',
  };

  const className = typeMap[type] || 'type-task';

  return (
    <span className={`badge ${className}`}>
      {type}
    </span>
  );
}
