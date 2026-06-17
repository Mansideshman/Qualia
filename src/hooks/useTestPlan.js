/**
 * useTestPlan.js
 * Custom hook for managing test plan state and operations
 */

import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook for test plan management
 * @returns {Object} - Test plan state and functions
 */
export function useTestPlan() {
  const [testPlan, setTestPlan] = useLocalStorage('lastSession.testPlan', null);
  const [lastIssueId, setLastIssueId] = useLocalStorage('lastSession.issueId', '');
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  /**
   * Update test plan
   */
  const updateTestPlan = useCallback((plan) => {
    setTestPlan(plan);
  }, [setTestPlan]);

  /**
   * Clear test plan
   */
  const clearTestPlan = useCallback(() => {
    setTestPlan(null);
    setStreamingText('');
  }, [setTestPlan]);

  /**
   * Start generation (update streaming state)
   */
  const startGeneration = useCallback(() => {
    setGenerationInProgress(true);
    setStreamingText('');
  }, []);

  /**
   * Update streaming text
   */
  const updateStreamingText = useCallback((text) => {
    setStreamingText(text);
  }, []);

  /**
   * End generation
   */
  const endGeneration = useCallback(() => {
    setGenerationInProgress(false);
  }, []);

  /**
   * Save last issue ID
   */
  const saveLastIssueId = useCallback((issueId) => {
    setLastIssueId(issueId);
  }, [setLastIssueId]);

  return {
    testPlan,
    lastIssueId,
    generationInProgress,
    streamingText,
    updateTestPlan,
    clearTestPlan,
    startGeneration,
    updateStreamingText,
    endGeneration,
    saveLastIssueId,
  };
}
