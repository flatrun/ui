import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSecurityStore } from "./security";

vi.mock("@/services/api", () => ({
  securityApi: {
    getStats: vi.fn(),
    getEvents: vi.fn(),
    getBlockedIPs: vi.fn(),
    getProtectedRoutes: vi.fn(),
    blockIP: vi.fn(),
    unblockIP: vi.fn(),
    addProtectedRoute: vi.fn(),
    updateProtectedRoute: vi.fn(),
    deleteProtectedRoute: vi.fn(),
    cleanup: vi.fn(),
    getRealtimeCaptureStatus: vi.fn(),
    setRealtimeCaptureStatus: vi.fn(),
  },
}));

describe("Security Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Initial state", () => {
    it("has correct initial values", () => {
      const store = useSecurityStore();
      expect(store.stats).toBeNull();
      expect(store.events).toEqual([]);
      expect(store.eventsTotal).toBe(0);
      expect(store.blockedIPs).toEqual([]);
      expect(store.protectedRoutes).toEqual([]);
      expect(store.securityEnabled).toBe(false);
      expect(store.realtimeCapture).toBe(false);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe("fetchEvents - null safety", () => {
    it("handles null events response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getEvents).mockResolvedValue({
        data: { events: null, total: null },
      } as any);

      const store = useSecurityStore();
      await store.fetchEvents();

      expect(store.events).toEqual([]);
      expect(store.eventsTotal).toBe(0);
    });

    it("handles undefined events response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getEvents).mockResolvedValue({
        data: { events: undefined, total: undefined },
      } as any);

      const store = useSecurityStore();
      await store.fetchEvents();

      expect(store.events).toEqual([]);
      expect(store.eventsTotal).toBe(0);
    });

    it("stores valid events correctly", async () => {
      const { securityApi } = await import("@/services/api");
      const mockEvents = [
        {
          id: 1,
          event_type: "suspicious_path",
          severity: "low",
          source_ip: "1.2.3.4",
          message: "Test",
          created_at: "2024-01-01",
        },
        {
          id: 2,
          event_type: "scanner_detected",
          severity: "high",
          source_ip: "5.6.7.8",
          message: "Test",
          created_at: "2024-01-01",
        },
      ];
      vi.mocked(securityApi.getEvents).mockResolvedValue({
        data: { events: mockEvents, total: 2, limit: 50, offset: 0 },
      } as any);

      const store = useSecurityStore();
      await store.fetchEvents();

      expect(store.events).toEqual(mockEvents);
      expect(store.eventsTotal).toBe(2);
    });
  });

  describe("fetchBlockedIPs - null safety", () => {
    it("handles null blocked_ips response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getBlockedIPs).mockResolvedValue({
        data: { blocked_ips: null },
      } as any);

      const store = useSecurityStore();
      await store.fetchBlockedIPs();

      expect(store.blockedIPs).toEqual([]);
    });

    it("handles undefined blocked_ips response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getBlockedIPs).mockResolvedValue({
        data: { blocked_ips: undefined },
      } as any);

      const store = useSecurityStore();
      await store.fetchBlockedIPs();

      expect(store.blockedIPs).toEqual([]);
    });

    it("stores valid blocked IPs correctly", async () => {
      const { securityApi } = await import("@/services/api");
      const mockBlockedIPs = [
        { id: 1, ip: "1.2.3.4", reason: "Manual block", blocked_at: "2024-01-01", auto_blocked: false },
        { id: 2, ip: "5.6.7.8", reason: "Auto block", blocked_at: "2024-01-01", auto_blocked: true },
      ];
      vi.mocked(securityApi.getBlockedIPs).mockResolvedValue({
        data: { blocked_ips: mockBlockedIPs },
      } as any);

      const store = useSecurityStore();
      await store.fetchBlockedIPs();

      expect(store.blockedIPs).toEqual(mockBlockedIPs);
    });
  });

  describe("fetchProtectedRoutes - null safety", () => {
    it("handles null protected_routes response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getProtectedRoutes).mockResolvedValue({
        data: { protected_routes: null },
      } as any);

      const store = useSecurityStore();
      await store.fetchProtectedRoutes();

      expect(store.protectedRoutes).toEqual([]);
    });

    it("handles undefined protected_routes response gracefully", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getProtectedRoutes).mockResolvedValue({
        data: { protected_routes: undefined },
      } as any);

      const store = useSecurityStore();
      await store.fetchProtectedRoutes();

      expect(store.protectedRoutes).toEqual([]);
    });

    it("stores valid protected routes correctly", async () => {
      const { securityApi } = await import("@/services/api");
      const mockRoutes = [
        {
          id: 1,
          path_pattern: "/admin/*",
          rate_limit: 10,
          block_duration: 3600,
          enabled: true,
          created_at: "2024-01-01",
        },
        {
          id: 2,
          path_pattern: "/api/*",
          rate_limit: 60,
          block_duration: 1800,
          enabled: true,
          created_at: "2024-01-01",
        },
      ];
      vi.mocked(securityApi.getProtectedRoutes).mockResolvedValue({
        data: { protected_routes: mockRoutes },
      } as any);

      const store = useSecurityStore();
      await store.fetchProtectedRoutes();

      expect(store.protectedRoutes).toEqual(mockRoutes);
    });
  });

  describe("fetchStats", () => {
    it("stores stats correctly", async () => {
      const { securityApi } = await import("@/services/api");
      const mockStats = {
        total_events: 100,
        last_24_hours: 10,
        last_7_days: 50,
        blocked_ips_count: 5,
        by_severity: { low: 30, medium: 40, high: 20, critical: 10 },
        by_type: { suspicious_path: 50, scanner_detected: 30, auth_failure: 20 },
        protected_routes_count: 3,
        rate_limit_hits: 15,
        auto_blocked_count: 2,
        manual_blocked_count: 3,
        top_ips: [],
      };
      vi.mocked(securityApi.getStats).mockResolvedValue({
        data: { stats: mockStats },
      } as any);

      const store = useSecurityStore();
      await store.fetchStats();

      expect(store.stats).toEqual(mockStats);
    });

    it("sets loading state during fetch", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getStats).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { stats: {} } } as any), 100)),
      );

      const store = useSecurityStore();
      const promise = store.fetchStats();

      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it("sets error on failure", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getStats).mockRejectedValue({
        response: { data: { error: "Security module not enabled" } },
      });

      const store = useSecurityStore();
      await store.fetchStats();

      expect(store.error).toBe("Security module not enabled");
    });
  });

  describe("blockIP", () => {
    it("calls API and refreshes blocked IPs", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.blockIP).mockResolvedValue({
        data: { id: 1, message: "IP blocked" },
      } as any);
      vi.mocked(securityApi.getBlockedIPs).mockResolvedValue({
        data: { blocked_ips: [{ id: 1, ip: "1.2.3.4", blocked_at: "2024-01-01", auto_blocked: false }] },
      } as any);

      const store = useSecurityStore();
      await store.blockIP("1.2.3.4", "Test reason", 3600);

      expect(securityApi.blockIP).toHaveBeenCalledWith("1.2.3.4", "Test reason", 3600);
      expect(securityApi.getBlockedIPs).toHaveBeenCalled();
    });
  });

  describe("unblockIP", () => {
    it("calls API and refreshes blocked IPs", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.unblockIP).mockResolvedValue({
        data: { message: "Unblocked" },
      } as any);
      vi.mocked(securityApi.getBlockedIPs).mockResolvedValue({
        data: { blocked_ips: [] },
      } as any);

      const store = useSecurityStore();
      await store.unblockIP("1.2.3.4");

      expect(securityApi.unblockIP).toHaveBeenCalledWith("1.2.3.4");
      expect(securityApi.getBlockedIPs).toHaveBeenCalled();
    });
  });

  describe("fetchRealtimeCaptureStatus", () => {
    it("stores realtime capture status correctly", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getRealtimeCaptureStatus).mockResolvedValue({
        data: { enabled: true, realtime_capture: true },
      } as any);

      const store = useSecurityStore();
      await store.fetchRealtimeCaptureStatus();

      expect(store.securityEnabled).toBe(true);
      expect(store.realtimeCapture).toBe(true);
    });
  });

  describe("setRealtimeCapture", () => {
    it("updates realtime capture status", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.setRealtimeCaptureStatus).mockResolvedValue({
        data: { realtime_capture: true, message: "Updated" },
      } as any);

      const store = useSecurityStore();
      await store.setRealtimeCapture(true);

      expect(securityApi.setRealtimeCaptureStatus).toHaveBeenCalledWith(true);
      expect(store.realtimeCapture).toBe(true);
    });
  });
});
