import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  dnsApi,
  type DNSProvider,
  type DNSZone,
  type DNSRecord,
  type DNSRecordCreate,
  type DNSRecordUpdate,
} from "@/services/api";

export const useDnsStore = defineStore("dns", () => {
  const providers = ref<DNSProvider[]>([]);
  const zones = ref<DNSZone[]>([]);
  const records = ref<DNSRecord[]>([]);
  const loading = ref(false);
  const error = ref("");

  const selectedProvider = ref<string>("");
  const selectedZone = ref<DNSZone | null>(null);
  const credentials = ref<Record<string, string>>({});
  const credentialsValid = ref(false);

  const currentProvider = computed(() => providers.value.find((p) => p.provider === selectedProvider.value));

  const fetchProviders = async () => {
    loading.value = true;
    error.value = "";

    try {
      const response = await dnsApi.getProviders();
      providers.value = response.data.providers || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to load providers";
    } finally {
      loading.value = false;
    }
  };

  const validateCredentials = async () => {
    if (!selectedProvider.value) return false;

    loading.value = true;
    error.value = "";
    credentialsValid.value = false;

    try {
      const response = await dnsApi.validateCredentials(selectedProvider.value, credentials.value);
      credentialsValid.value = response.data.valid;
      if (!response.data.valid && response.data.error) {
        error.value = response.data.error;
      }
      return response.data.valid;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to validate credentials";
      return false;
    } finally {
      loading.value = false;
    }
  };

  const fetchZones = async () => {
    if (!selectedProvider.value || !credentialsValid.value) return;

    loading.value = true;
    error.value = "";

    try {
      const response = await dnsApi.listZones(selectedProvider.value, credentials.value);
      zones.value = response.data.zones || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to load zones";
    } finally {
      loading.value = false;
    }
  };

  const fetchRecords = async (zoneId: string) => {
    if (!selectedProvider.value || !credentialsValid.value) return;

    loading.value = true;
    error.value = "";

    try {
      const response = await dnsApi.listRecords(selectedProvider.value, zoneId, credentials.value);
      records.value = response.data.records || [];
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to load records";
    } finally {
      loading.value = false;
    }
  };

  const createRecord = async (zoneId: string, record: DNSRecordCreate) => {
    if (!selectedProvider.value || !credentialsValid.value) return null;

    loading.value = true;
    error.value = "";

    try {
      const response = await dnsApi.createRecord(selectedProvider.value, zoneId, credentials.value, record);
      await fetchRecords(zoneId);
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to create record";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const updateRecord = async (zoneId: string, recordId: string, record: DNSRecordUpdate) => {
    if (!selectedProvider.value || !credentialsValid.value) return null;

    loading.value = true;
    error.value = "";

    try {
      const response = await dnsApi.updateRecord(selectedProvider.value, zoneId, recordId, credentials.value, record);
      await fetchRecords(zoneId);
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to update record";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const deleteRecord = async (zoneId: string, recordId: string) => {
    if (!selectedProvider.value || !credentialsValid.value) return false;

    loading.value = true;
    error.value = "";

    try {
      await dnsApi.deleteRecord(selectedProvider.value, zoneId, recordId, credentials.value);
      await fetchRecords(zoneId);
      return true;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || "Failed to delete record";
      return false;
    } finally {
      loading.value = false;
    }
  };

  const selectProvider = (provider: string) => {
    selectedProvider.value = provider;
    credentials.value = {};
    credentialsValid.value = false;
    zones.value = [];
    records.value = [];
    selectedZone.value = null;
  };

  const selectZone = async (zone: DNSZone) => {
    selectedZone.value = zone;
    await fetchRecords(zone.id);
  };

  const clearZone = () => {
    selectedZone.value = null;
    records.value = [];
  };

  const reset = () => {
    selectedProvider.value = "";
    credentials.value = {};
    credentialsValid.value = false;
    zones.value = [];
    records.value = [];
    selectedZone.value = null;
    error.value = "";
  };

  return {
    providers,
    zones,
    records,
    loading,
    error,
    selectedProvider,
    selectedZone,
    credentials,
    credentialsValid,
    currentProvider,
    fetchProviders,
    validateCredentials,
    fetchZones,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    selectProvider,
    selectZone,
    clearZone,
    reset,
  };
});
