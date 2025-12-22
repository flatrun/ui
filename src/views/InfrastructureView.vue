<template>
  <div class="infrastructure-view">
    <div class="view-header">
      <div class="header-content">
        <h1>Infrastructure</h1>
        <p class="subtitle">Manage core infrastructure services</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="fetchServices">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading infrastructure services...</span>
    </div>

    <div v-else class="services-grid">
      <div v-if="services.length === 0" class="empty-state">
        <i class="pi pi-server" />
        <h3>No Infrastructure Services</h3>
        <p>Configure infrastructure services in Settings to get started</p>
        <router-link to="/settings" class="btn btn-primary">
          <i class="pi pi-cog" />
          <span>Go to Settings</span>
        </router-link>
      </div>

      <DeploymentCard
        v-for="service in services"
        :key="service.name"
        :name="service.name"
        :status="getCardStatus(service)"
        :subtitle="service.type"
        :icon="getServiceIcon(service.type)"
        :icon-class="getServiceIconClass(service.type)"
        :external="service.external"
        :clickable="service.managed || service.external"
        @click="(service.managed || service.external) && goToDetails(service.name)"
      >
        <div v-if="hasDetails(service)" class="service-details">
          <div v-if="service.container_id" class="detail-item">
            <span class="detail-label">Container</span>
            <code>{{ service.container_id.substring(0, 12) }}</code>
          </div>
          <div v-if="service.image" class="detail-item">
            <span class="detail-label">Image</span>
            <code>{{ service.image }}</code>
          </div>
          <div v-if="service.health" class="detail-item">
            <span class="detail-label">Health</span>
            <span class="health-badge" :class="getHealthClass(service.health)">
              {{ service.health }}
            </span>
          </div>
        </div>

        <template v-if="hasActions(service)" #footer>
          <button
            v-if="!service.external && service.status === 'stopped'"
            class="btn btn-sm btn-success"
            :disabled="actionLoading === service.name"
            @click.stop="startService(service.name)"
          >
            <i class="pi pi-play" />
            <span>Start</span>
          </button>
          <button
            v-if="!service.external && service.status === 'running'"
            class="btn btn-sm btn-warning"
            :disabled="actionLoading === service.name"
            @click.stop="stopService(service.name)"
          >
            <i class="pi pi-stop" />
            <span>Stop</span>
          </button>
          <button
            v-if="!service.external && service.status === 'running'"
            class="btn btn-sm btn-secondary"
            :disabled="actionLoading === service.name"
            @click.stop="restartService(service.name)"
          >
            <i class="pi pi-refresh" />
            <span>Restart</span>
          </button>
          <button v-if="!service.external" class="btn btn-sm btn-secondary" @click.stop="showLogs(service.name)">
            <i class="pi pi-list" />
            <span>Logs</span>
          </button>
          <button v-if="service.managed" class="btn btn-sm btn-secondary" @click.stop="goToDetails(service.name)">
            <i class="pi pi-cog" />
            <span>Details</span>
          </button>
        </template>
      </DeploymentCard>
    </div>

    <LogsModal
      :visible="logsModal.visible"
      :title="logsModal.serviceName"
      subtitle="Service logs"
      :logs="logsModal.content"
      :loading="logsModal.loading"
      @close="closeLogs"
      @refresh="refreshLogs"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { infrastructureApi, type InfraService } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { executeWithServiceRestart } from "@/utils/resilientRequest";
import DeploymentCard from "@/components/DeploymentCard.vue";
import LogsModal from "@/components/LogsModal.vue";

const router = useRouter();
const notifications = useNotificationsStore();
const loading = ref(false);
const actionLoading = ref<string | null>(null);
const services = ref<InfraService[]>([]);

const logsModal = ref({
  visible: false,
  serviceName: "",
  content: "",
  loading: false,
});

const fetchServices = async () => {
  loading.value = true;
  try {
    const response = await infrastructureApi.list();
    services.value = response.data.services || [];
  } catch (e: any) {
    notifications.error("Error", "Failed to load infrastructure services");
  } finally {
    loading.value = false;
  }
};

const isCriticalService = (name: string) => {
  return name.toLowerCase().includes("nginx") || name.toLowerCase().includes("proxy");
};

const startService = async (name: string) => {
  actionLoading.value = name;
  try {
    await infrastructureApi.start(name);
    notifications.success("Service Started", `${name} has been started`);
    await fetchServices();
  } catch (e: any) {
    notifications.error("Error", `Failed to start ${name}`);
  } finally {
    actionLoading.value = null;
  }
};

const stopService = async (name: string) => {
  actionLoading.value = name;
  try {
    if (isCriticalService(name)) {
      const { serviceRestarted } = await executeWithServiceRestart(
        () => infrastructureApi.stop(name),
        () => infrastructureApi.list(),
        {
          onWaiting: (waiting) => {
            if (waiting) {
              notifications.info("Waiting", `Waiting for API to become available...`);
            }
          },
        },
      );
      if (serviceRestarted) {
        notifications.success("Service Stopped", `${name} has been stopped (reconnected to API)`);
      } else {
        notifications.success("Service Stopped", `${name} has been stopped`);
      }
    } else {
      await infrastructureApi.stop(name);
      notifications.success("Service Stopped", `${name} has been stopped`);
    }
    await fetchServices();
  } catch (e: any) {
    notifications.error("Error", `Failed to stop ${name}`);
  } finally {
    actionLoading.value = null;
  }
};

const restartService = async (name: string) => {
  actionLoading.value = name;
  try {
    if (isCriticalService(name)) {
      const { serviceRestarted } = await executeWithServiceRestart(
        () => infrastructureApi.restart(name),
        () => infrastructureApi.list(),
        {
          onWaiting: (waiting) => {
            if (waiting) {
              notifications.info("Reconnecting", `Service restarting, waiting for API...`);
            }
          },
        },
      );
      if (serviceRestarted) {
        notifications.success("Service Restarted", `${name} restarted successfully`);
      } else {
        notifications.success("Service Restarted", `${name} has been restarted`);
      }
    } else {
      await infrastructureApi.restart(name);
      notifications.success("Service Restarted", `${name} has been restarted`);
    }
    await fetchServices();
  } catch (e: any) {
    notifications.error("Error", `Failed to restart ${name}`);
  } finally {
    actionLoading.value = null;
  }
};

const showLogs = async (name: string) => {
  logsModal.value = {
    visible: true,
    serviceName: name,
    content: "",
    loading: true,
  };
  await fetchLogs(name);
};

const fetchLogs = async (name: string) => {
  logsModal.value.loading = true;
  try {
    const response = await infrastructureApi.logs(name, 200);
    logsModal.value.content = response.data.logs || "No logs available";
  } catch (e: any) {
    logsModal.value.content = "Failed to load logs";
  } finally {
    logsModal.value.loading = false;
  }
};

const refreshLogs = () => {
  if (logsModal.value.serviceName) {
    fetchLogs(logsModal.value.serviceName);
  }
};

const closeLogs = () => {
  logsModal.value.visible = false;
};

const goToDetails = (name: string) => {
  router.push(`/deployments/${name}?from=infrastructure`);
};

const getServiceIcon = (type: string) => {
  const icons: Record<string, string> = {
    nginx: "pi pi-server",
    database: "pi pi-database",
    redis: "pi pi-bolt",
    certbot: "pi pi-lock",
  };
  return icons[type] || "pi pi-box";
};

const getServiceIconClass = (type: string) => {
  const classes: Record<string, string> = {
    nginx: "icon-nginx",
    database: "icon-database",
    redis: "icon-redis",
    certbot: "icon-certbot",
  };
  return classes[type] || "icon-default";
};

const getCardStatus = (service: InfraService) => {
  if (service.external) return "external";
  return service.status as "running" | "stopped" | "error" | "unknown";
};

const getHealthClass = (health: string) => {
  const classes: Record<string, string> = {
    healthy: "health-healthy",
    unhealthy: "health-unhealthy",
    starting: "health-starting",
  };
  return classes[health] || "";
};

const hasDetails = (service: InfraService) => {
  return Boolean(service.container_id || service.image || service.health);
};

const hasActions = (service: InfraService) => {
  return !service.external || service.managed;
};

onMounted(() => {
  fetchServices();
});
</script>

<style scoped>
.infrastructure-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.btn-icon {
  padding: 0.625rem;
  background: transparent;
  border: none;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 16px;
  text-align: center;
  gap: 1rem;
}

.loading-state i,
.empty-state i {
  font-size: 3rem;
  color: #9ca3af;
}

.empty-state h3 {
  font-size: 1.125rem;
  color: #374151;
  margin: 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  align-items: start;
}

.service-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.8125rem;
  color: #6b7280;
}

.detail-item code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #374151;
}

.health-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.health-healthy {
  background: #dcfce7;
  color: #166534;
}

.health-unhealthy {
  background: #fee2e2;
  color: #991b1b;
}

.health-starting {
  background: #fef3c7;
  color: #92400e;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #22c55e;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #16a34a;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .services-grid {
    grid-template-columns: 1fr;
  }

  .service-actions {
    flex-wrap: wrap;
  }
}
</style>
