import { defineStore } from "pinia";
import { ref } from "vue";
import { securityApi, type SecurityHealthCheck, type SecurityRefreshResponse } from "@/services/api";
import type { SecurityEvent, SecurityStats, BlockedIP, ProtectedRoute } from "@/types";

export const useSecurityStore = defineStore("security", () => {
  const stats = ref<SecurityStats | null>(null);
  const events = ref<SecurityEvent[]>([]);
  const eventsTotal = ref(0);
  const blockedIPs = ref<BlockedIP[]>([]);
  const protectedRoutes = ref<ProtectedRoute[]>([]);
  const securityEnabled = ref(false);
  const realtimeCapture = ref(false);
  const health = ref<SecurityHealthCheck | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchStats() {
    loading.value = true;
    error.value = null;
    try {
      const response = await securityApi.getStats();
      stats.value = response.data.stats;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEvents(params?: {
    event_type?: string;
    severity?: string;
    source_ip?: string;
    deployment?: string;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await securityApi.getEvents(params);
      events.value = response.data.events || [];
      eventsTotal.value = response.data.total || 0;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchBlockedIPs() {
    loading.value = true;
    error.value = null;
    try {
      const response = await securityApi.getBlockedIPs();
      blockedIPs.value = response.data.blocked_ips || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function blockIP(ip: string, reason?: string, duration?: number) {
    try {
      await securityApi.blockIP(ip, reason, duration);
      await fetchBlockedIPs();
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function unblockIP(ip: string) {
    try {
      await securityApi.unblockIP(ip);
      await fetchBlockedIPs();
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function fetchProtectedRoutes() {
    loading.value = true;
    error.value = null;
    try {
      const response = await securityApi.getProtectedRoutes();
      protectedRoutes.value = response.data.protected_routes || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function addProtectedRoute(route: Partial<ProtectedRoute>) {
    try {
      await securityApi.addProtectedRoute(route);
      await fetchProtectedRoutes();
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function updateProtectedRoute(id: number, route: Partial<ProtectedRoute>) {
    try {
      await securityApi.updateProtectedRoute(id, route);
      await fetchProtectedRoutes();
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function deleteProtectedRoute(id: number) {
    try {
      await securityApi.deleteProtectedRoute(id);
      await fetchProtectedRoutes();
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function cleanup(days?: number) {
    try {
      const response = await securityApi.cleanup(days);
      await fetchStats();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function fetchRealtimeCaptureStatus() {
    try {
      const response = await securityApi.getRealtimeCaptureStatus();
      securityEnabled.value = response.data.enabled;
      realtimeCapture.value = response.data.realtime_capture;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    }
  }

  async function setRealtimeCapture(enabled: boolean) {
    try {
      const response = await securityApi.setRealtimeCaptureStatus(enabled);
      realtimeCapture.value = response.data.realtime_capture;
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  async function fetchHealth() {
    try {
      const response = await securityApi.getHealth();
      health.value = response.data;
    } catch (e: any) {
      health.value = {
        status: "disabled",
        error: e.response?.data?.error || e.message,
        checks: {},
        issues: [e.response?.data?.error || "Failed to fetch health status"],
        recommendations: [],
      };
    }
  }

  async function refreshScripts(): Promise<SecurityRefreshResponse> {
    try {
      const response = await securityApi.refreshScripts();
      await fetchHealth();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  return {
    stats,
    events,
    eventsTotal,
    blockedIPs,
    protectedRoutes,
    securityEnabled,
    realtimeCapture,
    health,
    loading,
    error,
    fetchStats,
    fetchEvents,
    fetchBlockedIPs,
    blockIP,
    unblockIP,
    fetchProtectedRoutes,
    addProtectedRoute,
    updateProtectedRoute,
    deleteProtectedRoute,
    cleanup,
    fetchRealtimeCaptureStatus,
    setRealtimeCapture,
    fetchHealth,
    refreshScripts,
  };
});
