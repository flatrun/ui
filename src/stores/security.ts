import { defineStore } from "pinia";
import { ref } from "vue";
import { securityApi } from "@/services/api";
import type { SecurityEvent, SecurityStats, BlockedIP, ProtectedRoute } from "@/types";

export const useSecurityStore = defineStore("security", () => {
  const stats = ref<SecurityStats | null>(null);
  const events = ref<SecurityEvent[]>([]);
  const eventsTotal = ref(0);
  const blockedIPs = ref<BlockedIP[]>([]);
  const protectedRoutes = ref<ProtectedRoute[]>([]);
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
      events.value = response.data.events;
      eventsTotal.value = response.data.total;
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
      blockedIPs.value = response.data.blocked_ips;
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
      protectedRoutes.value = response.data.protected_routes;
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

  return {
    stats,
    events,
    eventsTotal,
    blockedIPs,
    protectedRoutes,
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
  };
});
