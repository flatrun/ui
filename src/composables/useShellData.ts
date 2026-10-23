import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useStatsStore } from "@/stores/stats";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { clusterApi, type ClusterPeer } from "@/services/api";

const STATS_INTERVAL_MS = 15000;

// What every app shell loads and keeps fresh: stats, the signed-in user,
// Fleet peers and assistant status.
export function useShellData() {
  const router = useRouter();
  const statsStore = useStatsStore();
  const authStore = useAuthStore();
  const aiStore = useAIStore();
  const serverName = ref("Local Server");
  const peers = ref<ClusterPeer[]>([]);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function fetchCluster() {
    if (!authStore.hasPermission("cluster:read")) return;
    try {
      const res = await clusterApi.getStatus();
      if (res.data.enabled && res.data.server_name) {
        serverName.value = res.data.server_name;
        peers.value = (await clusterApi.listPeers()).data.peers || [];
      }
    } catch {
      // Fleet is optional; a single server has no peers.
    }
  }

  function logout() {
    authStore.logout();
    router.push("/login");
  }

  onMounted(() => {
    statsStore.fetchAll();
    authStore.fetchCurrentUser();
    aiStore.fetchStatus();
    fetchCluster();
    timer = setInterval(() => statsStore.fetchAll(), STATS_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { statsStore, authStore, serverName, peers, logout };
}
