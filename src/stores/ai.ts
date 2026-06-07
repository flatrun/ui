import { defineStore } from "pinia";
import { ref } from "vue";
import { aiApi, type AIStatus } from "@/services/api";

export const useAIStore = defineStore("ai", () => {
  const status = ref<AIStatus | null>(null);
  const loaded = ref(false);

  async function fetchStatus(force = false) {
    if (loaded.value && !force) return;
    try {
      const response = await aiApi.status();
      status.value = response.data;
    } catch {
      status.value = { enabled: false };
    } finally {
      loaded.value = true;
    }
  }

  return { status, loaded, fetchStatus };
});
