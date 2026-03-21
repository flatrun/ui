import { defineStore } from "pinia";
import { ref } from "vue";
import { apiClient } from "@/services/api";

export interface SetupCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  required: boolean;
}

export interface DNSResult {
  valid: boolean;
  domain: string;
  expected: string;
  actual: string[];
  message?: string;
}

export interface AuthResult {
  auth_method: string;
  username?: string;
  user_uid?: string;
  api_key?: string;
  api_key_id?: string;
}

export const useSetupStore = defineStore("setup", () => {
  const initialized = ref<boolean | null>(null);
  const instanceIp = ref("");
  const agentVersion = ref("");
  const loading = ref(false);
  const error = ref("");

  async function checkSetupStatus(force = false) {
    if (!force && initialized.value !== null) return;
    try {
      const { data } = await apiClient.get("/setup/status");
      initialized.value = data.initialized;
    } catch (e: any) {
      if (e.code === "ERR_NETWORK") {
        error.value = "Unable to reach FlatRun Agent. Is the service running?";
      } else {
        error.value = e.response?.data?.error || "Failed to check setup status";
      }
    }
  }

  const infoLoaded = ref(false);

  async function fetchSetupInfo() {
    try {
      const { data } = await apiClient.get("/setup/info");
      instanceIp.value = data.instance_ip || "Unknown";
      agentVersion.value =
        typeof data.agent_version === "object" ? data.agent_version.version : data.agent_version || "Unknown";
    } catch {
      // non-critical, setup wizard still works without it
    } finally {
      infoLoaded.value = true;
    }
  }

  async function runValidation(): Promise<SetupCheck[]> {
    loading.value = true;
    error.value = "";
    try {
      const { data } = await apiClient.post("/setup/validate");
      return data.checks || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || "Validation failed";
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function verifyDNS(domain: string): Promise<DNSResult | null> {
    loading.value = true;
    error.value = "";
    try {
      const { data } = await apiClient.get("/setup/verify-dns", { params: { domain } });
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.error || "DNS verification failed";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings(payload: { domain?: string; auto_ssl?: boolean; cors_origins?: string[] }) {
    loading.value = true;
    error.value = "";
    try {
      const { data } = await apiClient.post("/setup/settings", payload);
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Failed to save settings";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function configureAuth(payload: {
    auth_method: string;
    username?: string;
    password?: string;
    email?: string;
  }): Promise<AuthResult | null> {
    loading.value = true;
    error.value = "";
    try {
      const { data } = await apiClient.post("/setup/authentication", payload);
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Failed to configure authentication";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function completeSetup() {
    loading.value = true;
    error.value = "";
    try {
      const { data } = await apiClient.post("/setup/complete");
      initialized.value = true;
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Failed to complete setup";
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    initialized,
    instanceIp,
    agentVersion,
    infoLoaded,
    loading,
    error,
    checkSetupStatus,
    fetchSetupInfo,
    runValidation,
    verifyDNS,
    saveSettings,
    configureAuth,
    completeSetup,
  };
});
