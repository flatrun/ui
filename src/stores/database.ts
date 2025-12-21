import { defineStore } from "pinia";
import { ref } from "vue";

export interface QueryHistoryItem {
  id: string;
  query: string;
  database: string;
  timestamp: number;
  rowCount?: number;
  executionTime?: number;
  success: boolean;
  error?: string;
  favorite?: boolean;
}

export interface ConnectionState {
  status: "connected" | "disconnected" | "error";
  lastPing: number | null;
  latency: number | null;
  error?: string;
}

const HISTORY_STORAGE_KEY = "db_query_history";
const FAVORITES_STORAGE_KEY = "db_query_favorites";
const MAX_HISTORY_ITEMS = 100;

export const useDatabaseStore = defineStore("database", () => {
  const connectionStates = ref<Map<string, ConnectionState>>(new Map());
  const queryHistory = ref<Map<string, QueryHistoryItem[]>>(new Map());
  const favoriteQueries = ref<Map<string, QueryHistoryItem[]>>(new Map());

  function getConnectionState(connectionId: string): ConnectionState {
    return (
      connectionStates.value.get(connectionId) || {
        status: "disconnected",
        lastPing: null,
        latency: null,
      }
    );
  }

  function setConnectionState(connectionId: string, state: Partial<ConnectionState>) {
    const current = getConnectionState(connectionId);
    connectionStates.value.set(connectionId, { ...current, ...state });
  }

  function loadHistoryFromStorage(connectionId: string) {
    try {
      const stored = localStorage.getItem(`${HISTORY_STORAGE_KEY}_${connectionId}`);
      if (stored) {
        queryHistory.value.set(connectionId, JSON.parse(stored));
      }
      const favorites = localStorage.getItem(`${FAVORITES_STORAGE_KEY}_${connectionId}`);
      if (favorites) {
        favoriteQueries.value.set(connectionId, JSON.parse(favorites));
      }
    } catch {
      queryHistory.value.set(connectionId, []);
      favoriteQueries.value.set(connectionId, []);
    }
  }

  function saveHistoryToStorage(connectionId: string) {
    const history = queryHistory.value.get(connectionId) || [];
    localStorage.setItem(`${HISTORY_STORAGE_KEY}_${connectionId}`, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  }

  function saveFavoritesToStorage(connectionId: string) {
    const favorites = favoriteQueries.value.get(connectionId) || [];
    localStorage.setItem(`${FAVORITES_STORAGE_KEY}_${connectionId}`, JSON.stringify(favorites));
  }

  function addToHistory(connectionId: string, item: Omit<QueryHistoryItem, "id" | "timestamp">) {
    const history = queryHistory.value.get(connectionId) || [];
    const newItem: QueryHistoryItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    history.unshift(newItem);
    queryHistory.value.set(connectionId, history.slice(0, MAX_HISTORY_ITEMS));
    saveHistoryToStorage(connectionId);
    return newItem;
  }

  function getHistory(connectionId: string): QueryHistoryItem[] {
    if (!queryHistory.value.has(connectionId)) {
      loadHistoryFromStorage(connectionId);
    }
    return queryHistory.value.get(connectionId) || [];
  }

  function getFavorites(connectionId: string): QueryHistoryItem[] {
    if (!favoriteQueries.value.has(connectionId)) {
      loadHistoryFromStorage(connectionId);
    }
    return favoriteQueries.value.get(connectionId) || [];
  }

  function toggleFavorite(connectionId: string, itemId: string) {
    const history = queryHistory.value.get(connectionId) || [];
    const favorites = favoriteQueries.value.get(connectionId) || [];

    const historyItem = history.find((h) => h.id === itemId);
    if (!historyItem) return;

    const existingIndex = favorites.findIndex((f) => f.id === itemId);
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      historyItem.favorite = false;
    } else {
      historyItem.favorite = true;
      favorites.unshift({ ...historyItem });
    }

    favoriteQueries.value.set(connectionId, favorites);
    saveFavoritesToStorage(connectionId);
    saveHistoryToStorage(connectionId);
  }

  function removeFromHistory(connectionId: string, itemId: string) {
    const history = queryHistory.value.get(connectionId) || [];
    const index = history.findIndex((h) => h.id === itemId);
    if (index >= 0) {
      history.splice(index, 1);
      queryHistory.value.set(connectionId, history);
      saveHistoryToStorage(connectionId);
    }

    const favorites = favoriteQueries.value.get(connectionId) || [];
    const favIndex = favorites.findIndex((f) => f.id === itemId);
    if (favIndex >= 0) {
      favorites.splice(favIndex, 1);
      favoriteQueries.value.set(connectionId, favorites);
      saveFavoritesToStorage(connectionId);
    }
  }

  function clearHistory(connectionId: string) {
    queryHistory.value.set(connectionId, []);
    localStorage.removeItem(`${HISTORY_STORAGE_KEY}_${connectionId}`);
  }

  function searchHistory(connectionId: string, searchTerm: string): QueryHistoryItem[] {
    const history = getHistory(connectionId);
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(
      (item) => item.query.toLowerCase().includes(term) || item.database.toLowerCase().includes(term),
    );
  }

  return {
    connectionStates,
    queryHistory,
    favoriteQueries,
    getConnectionState,
    setConnectionState,
    loadHistoryFromStorage,
    addToHistory,
    getHistory,
    getFavorites,
    toggleFavorite,
    removeFromHistory,
    clearHistory,
    searchHistory,
  };
});
