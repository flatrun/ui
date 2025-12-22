import { defineStore } from "pinia";
import { ref } from "vue";
import { trafficApi, type TrafficLog, type TrafficStats, type TrafficFilter } from "@/services/api";

export const useTrafficStore = defineStore("traffic", () => {
  const logs = ref<TrafficLog[]>([]);
  const logsTotal = ref(0);
  const stats = ref<TrafficStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchLogs(params?: TrafficFilter) {
    loading.value = true;
    error.value = null;
    try {
      const response = await trafficApi.getLogs(params);
      logs.value = response.data.logs || [];
      logsTotal.value = response.data.total || 0;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats(params?: { deployment?: string; since?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await trafficApi.getStats(params);
      stats.value = response.data.stats;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDeploymentStats(name: string, since?: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await trafficApi.getDeploymentStats(name, since);
      stats.value = response.data.stats;
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function cleanup(days?: number) {
    try {
      const response = await trafficApi.cleanup(days);
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw e;
    }
  }

  function clearLogs() {
    logs.value = [];
    logsTotal.value = 0;
  }

  function clearStats() {
    stats.value = null;
  }

  return {
    logs,
    logsTotal,
    stats,
    loading,
    error,
    fetchLogs,
    fetchStats,
    fetchDeploymentStats,
    cleanup,
    clearLogs,
    clearStats,
  };
});
