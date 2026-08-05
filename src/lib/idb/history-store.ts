import { openDB, type IDBPDatabase } from 'idb';
import type { ConversionHistoryEntry } from '@/types';

const DB_NAME = 'switchfile-history';
const DB_VERSION = 1;
const STORE_NAME = 'conversions';

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Get or open the IndexedDB database connection.
 */
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-date', 'createdAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Add a new conversion history entry to IndexedDB.
 */
export async function addHistoryEntry(
  entry: ConversionHistoryEntry
): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (error) {
    console.warn('[SwitchFile] Failed to save history entry:', error);
  }
}

/**
 * Get the most recent conversion history entries.
 * @param limit - Maximum number of entries to return (default: 10)
 */
export async function getRecentHistory(
  limit: number = 10
): Promise<ConversionHistoryEntry[]> {
  try {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);

    // Sort by createdAt descending (newest first)
    const sorted = all
      .map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
      }))
      .sort(
        (a, b) =>
          (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
      );

    return sorted.slice(0, limit) as ConversionHistoryEntry[];
  } catch (error) {
    console.warn('[SwitchFile] Failed to read history:', error);
    return [];
  }
}

/**
 * Clear all conversion history from IndexedDB.
 */
export async function clearHistory(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.warn('[SwitchFile] Failed to clear history:', error);
  }
}

/**
 * Delete a single history entry by ID.
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  } catch (error) {
    console.warn('[SwitchFile] Failed to delete history entry:', error);
  }
}

/**
 * Get the total number of entries in the history store.
 */
export async function getHistoryCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count(STORE_NAME);
  } catch (error) {
    console.warn('[SwitchFile] Failed to count history entries:', error);
    return 0;
  }
}
