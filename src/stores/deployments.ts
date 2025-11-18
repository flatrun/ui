import { defineStore } from "pinia";
import { ref } from "vue";
import { deploymentsApi } from "@/services/api";
import type { Deployment } from "@/types";

export const useDeploymentsStore = defineStore("deployments", () => {
  const deployments = ref<Deployment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDeployments() {
    loading.value = true;
    error.value = null;
    try {
      const response = await deploymentsApi.list();
      deployments.value = response.data.deployments;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function startDeployment(name: string) {
    try {
      await deploymentsApi.start(name);
      await fetchDeployments();
    } catch (e: any) {
      error.value = e.message;
    }
  }

  async function stopDeployment(name: string) {
    try {
      await deploymentsApi.stop(name);
      await fetchDeployments();
    } catch (e: any) {
      error.value = e.message;
    }
  }

  async function restartDeployment(name: string) {
    try {
      await deploymentsApi.restart(name);
      await fetchDeployments();
    } catch (e: any) {
      error.value = e.message;
    }
  }

  return {
    deployments,
    loading,
    error,
    fetchDeployments,
    startDeployment,
    stopDeployment,
    restartDeployment,
  };
});
