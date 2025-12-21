import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useDatabaseStore } from "./database";

describe("Database Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Initial state", () => {
    it("has correct initial values", () => {
      const store = useDatabaseStore();
      expect(store.queryHistory.size).toBe(0);
      expect(store.connectionStates.size).toBe(0);
    });
  });

  describe("Query History", () => {
    it("adds query to history", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT * FROM users",
        database: "test_db",
        success: true,
        rowCount: 10,
        executionTime: 50,
      });

      const history = store.getHistory(connectionId);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("SELECT * FROM users");
      expect(history[0].database).toBe("test_db");
      expect(history[0].success).toBe(true);
      expect(history[0].rowCount).toBe(10);
    });

    it("limits history to 100 items", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      for (let i = 0; i < 110; i++) {
        store.addToHistory(connectionId, {
          query: `SELECT ${i}`,
          database: "test_db",
          success: true,
        });
      }

      const history = store.getHistory(connectionId);
      expect(history).toHaveLength(100);
      expect(history[0].query).toBe("SELECT 109");
    });

    it("returns empty array for unknown connection", () => {
      const store = useDatabaseStore();
      expect(store.getHistory("unknown")).toEqual([]);
    });

    it("toggles favorite status", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT * FROM users",
        database: "test_db",
        success: true,
      });

      const history = store.getHistory(connectionId);
      const itemId = history[0].id;

      expect(history[0].favorite).toBeFalsy();

      store.toggleFavorite(connectionId, itemId);
      expect(store.getHistory(connectionId)[0].favorite).toBe(true);

      store.toggleFavorite(connectionId, itemId);
      expect(store.getHistory(connectionId)[0].favorite).toBe(false);
    });

    it("returns favorites only", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT 1",
        database: "test_db",
        success: true,
      });
      store.addToHistory(connectionId, {
        query: "SELECT 2",
        database: "test_db",
        success: true,
      });

      const history = store.getHistory(connectionId);
      store.toggleFavorite(connectionId, history[0].id);

      const favorites = store.getFavorites(connectionId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].query).toBe("SELECT 2");
    });

    it("searches history by query text", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT * FROM users",
        database: "test_db",
        success: true,
      });
      store.addToHistory(connectionId, {
        query: "SELECT * FROM orders",
        database: "test_db",
        success: true,
      });

      const results = store.searchHistory(connectionId, "users");
      expect(results).toHaveLength(1);
      expect(results[0].query).toContain("users");
    });

    it("searches history by database name", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT 1",
        database: "prod_db",
        success: true,
      });
      store.addToHistory(connectionId, {
        query: "SELECT 2",
        database: "test_db",
        success: true,
      });

      const results = store.searchHistory(connectionId, "prod");
      expect(results).toHaveLength(1);
      expect(results[0].database).toBe("prod_db");
    });

    it("removes item from history", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT 1",
        database: "test_db",
        success: true,
      });
      store.addToHistory(connectionId, {
        query: "SELECT 2",
        database: "test_db",
        success: true,
      });

      const history = store.getHistory(connectionId);
      expect(history).toHaveLength(2);

      store.removeFromHistory(connectionId, history[0].id);
      expect(store.getHistory(connectionId)).toHaveLength(1);
    });

    it("clears all history for connection", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT 1",
        database: "test_db",
        success: true,
      });
      store.addToHistory(connectionId, {
        query: "SELECT 2",
        database: "test_db",
        success: true,
      });

      store.clearHistory(connectionId);
      expect(store.getHistory(connectionId)).toHaveLength(0);
    });
  });

  describe("Connection State", () => {
    it("sets connection state", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.setConnectionState(connectionId, {
        status: "connected",
        latency: 50,
        lastPing: Date.now(),
      });

      const state = store.getConnectionState(connectionId);
      expect(state?.status).toBe("connected");
      expect(state?.latency).toBe(50);
    });

    it("returns default state for unknown connection", () => {
      const store = useDatabaseStore();
      const state = store.getConnectionState("unknown");
      expect(state.status).toBe("disconnected");
      expect(state.lastPing).toBeNull();
      expect(state.latency).toBeNull();
    });
  });

  describe("LocalStorage Persistence", () => {
    it("saves history to localStorage", () => {
      const store = useDatabaseStore();
      const connectionId = "conn-1";

      store.addToHistory(connectionId, {
        query: "SELECT * FROM users",
        database: "test_db",
        success: true,
      });

      // addToHistory automatically saves to localStorage
      const stored = localStorage.getItem(`db_query_history_${connectionId}`);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].query).toBe("SELECT * FROM users");
    });

    it("loads history from localStorage", () => {
      const connectionId = "conn-1";
      const mockHistory = [
        {
          id: "test-id",
          query: "SELECT 1",
          database: "test_db",
          timestamp: Date.now(),
          success: true,
        },
      ];

      localStorage.setItem(
        `db_query_history_${connectionId}`,
        JSON.stringify(mockHistory)
      );

      const store = useDatabaseStore();
      store.loadHistoryFromStorage(connectionId);

      const history = store.getHistory(connectionId);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("SELECT 1");
    });

    it("handles corrupted localStorage gracefully", () => {
      const connectionId = "conn-1";
      localStorage.setItem(`db_query_history_${connectionId}`, "invalid json");

      const store = useDatabaseStore();
      store.loadHistoryFromStorage(connectionId);

      expect(store.getHistory(connectionId)).toEqual([]);
    });
  });
});
