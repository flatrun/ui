import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import {
  healthApi,
  networksApi,
  certificatesApi,
  pluginsApi,
  portsApi,
  systemServicesApi,
  containersApi,
  infrastructureApi,
} from "@/services/api";

export const useStatsStore = defineStore("stats", () => {
  const loading = ref(false);
  const lastUpdated = ref<Date | null>(null);
  const agentOnline = ref(false);
  const agentVersion = ref("unknown");

  const deployments = reactive({
    total: 0,
    running: 0,
    stopped: 0,
    error: 0,
  });

  const containers = reactive({
    total: 0,
    running: 0,
    stopped: 0,
  });

  const docker = reactive({
    images: 0,
    volumes: 0,
    networks: 0,
    ports: 0,
  });

  const system = reactive({
    ports: 0,
    services: 0,
    infrastructure: 0,
    certificates: 0,
    apps: 0,
    databases: 0,
  });

  const resources = reactive({
    cpu: 0,
    memory: 0,
    disk: 0,
  });

  async function fetchAll() {
    if (loading.value) return;
    loading.value = true;

    try {
      const healthRes = await healthApi.check();
      agentOnline.value = healthRes.data.status === "healthy";
      if (healthRes.data.version?.version) {
        agentVersion.value = healthRes.data.version.version;
      }
      if (healthRes.data.stats) {
        deployments.total = healthRes.data.stats.total_deployments || 0;
        deployments.running = healthRes.data.stats.running || 0;
        deployments.stopped = healthRes.data.stats.stopped || 0;
        deployments.error = healthRes.data.stats.error || 0;
      }

      const statsRes = await healthApi.stats();
      if (statsRes.data) {
        const data = statsRes.data;
        containers.total = data.containers?.total || 0;
        containers.running = data.containers?.running || 0;
        containers.stopped = data.containers?.stopped || 0;
        docker.images = data.images?.total || 0;
        docker.volumes = data.volumes?.total || 0;
      }

      if (statsRes.data?.system) {
        const sys = statsRes.data.system;
        resources.cpu = Math.round((sys.cpu?.usage_percent || 0) * 10) / 10;
        resources.memory = Math.round((sys.memory?.usage_percent || 0) * 10) / 10;
        resources.disk = Math.round((sys.disk?.usage_percent || 0) * 10) / 10;
      }

      const [networksRes, certsRes, pluginsRes, portsRes, servicesRes, containersRes, infraRes] =
        await Promise.allSettled([
          networksApi.list(),
          certificatesApi.list(),
          pluginsApi.list(),
          portsApi.list(),
          systemServicesApi.list(),
          containersApi.list(),
          infrastructureApi.list(),
        ]);

      if (networksRes.status === "fulfilled") {
        docker.networks = networksRes.value.data.networks?.length || 0;
      }
      if (certsRes.status === "fulfilled") {
        system.certificates = certsRes.value.data.certificates?.length || 0;
      }
      if (pluginsRes.status === "fulfilled") {
        system.apps = pluginsRes.value.data.plugins?.length || 0;
      }
      if (portsRes.status === "fulfilled") {
        system.ports = portsRes.value.data.ports?.length || 0;
      }
      if (servicesRes.status === "fulfilled") {
        system.services = servicesRes.value.data.services?.length || 0;
      }
      if (containersRes.status === "fulfilled") {
        const containersList = containersRes.value.data.containers || [];
        let portCount = 0;
        for (const container of containersList) {
          if (Array.isArray(container.ports)) {
            portCount += container.ports.length;
          }
        }
        docker.ports = portCount;
      }
      if (infraRes.status === "fulfilled") {
        system.infrastructure = infraRes.value.data.services?.length || 0;
      }

      try {
        const dbConnections = localStorage.getItem("db_connections");
        if (dbConnections) {
          system.databases = JSON.parse(dbConnections).length || 0;
        }
      } catch {
        system.databases = 0;
      }

      lastUpdated.value = new Date();
    } catch {
      agentOnline.value = false;
    } finally {
      loading.value = false;
    }
  }

  function formatLastUpdated() {
    if (!lastUpdated.value) return "never";
    return lastUpdated.value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return {
    loading,
    lastUpdated,
    agentOnline,
    agentVersion,
    deployments,
    containers,
    docker,
    system,
    resources,
    fetchAll,
    formatLastUpdated,
  };
});
