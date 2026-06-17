/**
 * LoadingSpinner.jsx
 * Loading spinner component
 */

import React from 'react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner component
 * @param {Object} props - Component props
 * @param {string} props.size - Spinner size (small, medium, large)
 * @param {string} props.message - Loading message
 */
export default function LoadingSpinner({ size = 'medium', message }) {
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner loading-spinner-${size}`}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}
