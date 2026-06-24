import React, { createContext, useContext, useState, useCallback } from 'react';

const HistoryContext = createContext(null);
const STORAGE_KEY = 'qualia_history_v1';
const MAX_ITEMS   = 100;

export const HISTORY_TYPES = {
  qabuddy:    { label: 'QA Buddy',            icon: '🤖' },
  generation: { label: 'Test Intelligence',   icon: '⚡' },
  testcases:  { label: 'Scenario Forge',      icon: '🧪' },
  strategy:   { label: 'Test Blueprint',      icon: '📐' },
  metrics:    { label: 'Release Confidence',  icon: '📊' },
  defect:     { label: 'Defect Radar',        icon: '🔍' },
  apiforge:   { label: 'API Contract Forge',  icon: '🔗' },
  codegen:    { label: 'Test Code Gen',       icon: '🎭' },
  framework:  { label: 'Framework Forge',     icon: '🏗️' },
};

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function persist(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function HistoryProvider({ children }) {
  const [items, setItems]               = useState(load);
  const [pendingRestore, setPendingRestore] = useState(null);

  const saveItem = useCallback((type, title, data) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title: (title || 'Untitled').slice(0, 80),
      savedAt: new Date().toISOString(),
      data,
    };
    setItems(prev => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      persist(next);
      return next;
    });
    return item.id;
  }, []);

  const deleteItem = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const triggerRestore = useCallback((type, data) => {
    setPendingRestore({ type, data });
  }, []);

  const clearPendingRestore = useCallback(() => {
    setPendingRestore(null);
  }, []);

  return (
    <HistoryContext.Provider value={{
      items, saveItem, deleteItem, clearAll,
      pendingRestore, triggerRestore, clearPendingRestore,
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => useContext(HistoryContext);
