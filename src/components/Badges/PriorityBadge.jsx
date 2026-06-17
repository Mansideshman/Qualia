/**
 * PriorityBadge.jsx
 * Priority level badge component
 */

import React from 'react';
import './Badge.css';

/**
 * PriorityBadge component
 * @param {Object} props - Component props
 * @param {string} props.priority - Priority level (High, Medium, Low)
 */
export default function PriorityBadge({ priority }) {
  if (!priority) return null;

  const priorityMap = {
    'High': 'priority-high',
    'Medium': 'priority-medium',
    'Low': 'priority-low',
    'Highest': 'priority-high',
    'Lowest': 'priority-low',
  };

  const className = priorityMap[priority] || 'priority-medium';

  return (
    <span className={`badge ${className}`}>
      {priority}
    </span>
  );
}
