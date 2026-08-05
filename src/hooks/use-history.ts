'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversionHistoryEntry } from '@/types';
import {
  getRecentHistory,
  clearHistory as clearHistoryStore,
  deleteHistoryEntry,
} from '@/lib/idb/history-store';

interface UseHistoryReturn {
  /** Recent conversion history entries (newest first) */
  history: ConversionHistoryEntry[];
  /** Whether history is currently loading */
  isLoading: boolean;
  /** Refresh the history from IndexedDB */
  refresh: () => Promise<void>;
  /** Clear all history entries */
  clearHistory: () => Promise<void>;
  /** Delete a single history entry */
  deleteEntry: (id: string) => Promise<void>;
}

export function useHistory(limit: number = 10): UseHistoryReturn {
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load recent history from IndexedDB.
   */
  const refresh = useCallback(async () => {
    try {
      const entries = await getRecentHistory(limit);
      setHistory(entries);
    } catch (error) {
      console.warn('[SwitchFile] Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  /**
   * Clear all history.
   */
  const clearHistory = useCallback(async () => {
    await clearHistoryStore();
    setHistory([]);
  }, []);

  /**
   * Delete a single entry.
   */
  const deleteEntry = useCallback(
    async (id: string) => {
      await deleteHistoryEntry(id);
      await refresh();
    },
    [refresh]
  );

  // Load history on mount & subscribe to updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('switchfile-history-update', handleUpdate);
    return () => {
      window.removeEventListener('switchfile-history-update', handleUpdate);
    };
  }, [refresh]);

  return {
    history,
    isLoading,
    refresh,
    clearHistory,
    deleteEntry,
  };
}
