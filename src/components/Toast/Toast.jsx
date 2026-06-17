/**
 * Toast.jsx
 * Individual toast notification component
 */

import React, { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Toast component
 * @param {Object} props - Component props
 * @param {string} props.message - Toast message
 * @param {string} props.type - Toast type (success, error, info, warning)
 * @param {Function} props.onClose - Callback when toast is closed
 */
export default function Toast({ message, type = 'info', onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Allow animation to finish
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
    warning: '⚠',
  };

  return (
    <div
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
    >
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
