/**
 * NotificationContext.jsx
 * Global notification/toast context
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

/**
 * NotificationProvider component
 * Manages toast notifications
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Add a notification
   */
  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  /**
   * Show success notification
   */
  const success = useCallback((message, duration) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);

  /**
   * Show error notification
   */
  const error = useCallback((message, duration) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);

  /**
   * Show info notification
   */
  const info = useCallback((message, duration) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);

  /**
   * Show warning notification
   */
  const warning = useCallback((message, duration) => {
    return addNotification(message, 'warning', duration);
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
