/**
 * ToastContainer.jsx
 * Container for displaying multiple toast notifications
 */

import React from 'react';
import Toast from './Toast';
import { useNotification } from '../../context/NotificationContext';
import './ToastContainer.css';

/**
 * ToastContainer component
 * Displays all active toast notifications
 */
export default function ToastContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
