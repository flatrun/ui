<template>
  <div class="services-view">
    <DataTable
      :items="services"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search services..."
      :search-fields="['name', 'description', 'status']"
      item-key="name"
      :empty-icon="Cog"
      empty-title="No Services Found"
      empty-text="Unable to retrieve system services."
      loading-text="Loading services..."
      :default-page-size="25"
    >
      <template #actions>
        <div class="filter-buttons">
          <button
            v-for="filter in filterOptions"
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activeFilter === filter.value }"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
        <button class="btn btn-secondary" :disabled="loading" @click="fetchServices">
          <RefreshCw :size="16" :class="{ spinning: loading }" />
          Refresh
        </button>
      </template>

      <template #cell-status="{ item }">
        <div class="status-wrapper">
          <span class="status-dot" :class="item.active" />
          <span class="status-badge" :class="item.active">
            {{ item.active }}
          </span>
        </div>
      </template>

      <template #cell-name="{ item }">
        <div class="service-info">
          <span class="service-name">{{ item.name }}</span>
          <span class="service-type">{{ item.type }}</span>
        </div>
      </template>

      <template #cell-description="{ item }">
        <span class="service-description">{{ item.description || "—" }}</span>
      </template>

      <template #cell-sub="{ item }">
        <span class="sub-state" :class="item.sub">
          {{ item.sub }}
        </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            v-if="item.active !== 'active'"
            class="action-btn start"
            title="Start Service"
            @click.stop="controlService(item.name, 'start')"
          >
            <Play :size="14" />
          </button>
          <button
            v-if="item.active === 'active'"
            class="action-btn stop"
            title="Stop Service"
            @click.stop="controlService(item.name, 'stop')"
          >
            <Square :size="14" />
          </button>
          <button class="action-btn restart" title="Restart Service" @click.stop="controlService(item.name, 'restart')">
            <RotateCw :size="14" />
          </button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { systemServicesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import DataTable from "@/components/DataTable.vue";
import { RefreshCw, Cog, Play, Square, RotateCw } from "lucide-vue-next";

interface SystemService {
  name: string;
  type: string;
  description: string;
  load: string;
  active: string;
  sub: string;
}

const allServices = ref<SystemService[]>([]);
const loading = ref(false);
const activeFilter = ref("all");
const notifications = useNotificationsStore();

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Running", value: "active" },
  { label: "Stopped", value: "inactive" },
  { label: "Failed", value: "failed" },
];

const services = computed(() => {
  if (activeFilter.value === "all") return allServices.value;
  return allServices.value.filter((s) => s.active === activeFilter.value);
});

const columns = [
  { key: "status", label: "", width: "80px" },
  { key: "name", label: "Service", sortable: true },
  { key: "description", label: "Description", sortable: true },
  { key: "sub", label: "State", sortable: true, width: "120px" },
  { key: "actions", label: "Actions", width: "120px" },
];

const fetchServices = async () => {
  loading.value = true;
  try {
    const response = await systemServicesApi.list();
    allServices.value = response.data.services || [];
  } catch (error: any) {
    notifications.error("Failed to fetch services", error.message);
    allServices.value = [];
  } finally {
    loading.value = false;
  }
};

const controlService = async (name: string, action: "start" | "stop" | "restart") => {
  try {
    if (action === "start") {
      await systemServicesApi.start(name);
    } else if (action === "stop") {
      await systemServicesApi.stop(name);
    } else if (action === "restart") {
      await systemServicesApi.restart(name);
    }
    notifications.success("Service Control", `Successfully ${action}ed ${name}`);
    await fetchServices();
  } catch (error: any) {
    notifications.error(`Failed to ${action} service`, error.message);
  }
};

onMounted(() => {
  fetchServices();
});
</script>

<style scoped>
.services-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filter-buttons {
  display: flex;
  gap: var(--space-1);
  margin-right: var(--space-4);
}

.filter-btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  background: white;
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  background: var(--color-gray-50);
}

.filter-btn.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-700);
}

.status-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gray-400);
}

.status-dot.active {
  background: var(--color-success-500);
}

.status-dot.inactive {
  background: var(--color-gray-400);
}

.status-dot.failed {
  background: var(--color-danger-500);
}

.status-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.status-badge.active {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-badge.inactive {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.status-badge.failed {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.service-name {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.service-type {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.service-description {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-state {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: lowercase;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.sub-state.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.sub-state.dead,
.sub-state.failed {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.sub-state.exited {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn.start {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.action-btn.start:hover {
  background: var(--color-success-100);
}

.action-btn.stop {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.action-btn.stop:hover {
  background: var(--color-warning-100);
}

.action-btn.restart {
  background: var(--color-info-50);
  color: var(--color-info-600);
}

.action-btn.restart:hover {
  background: var(--color-info-100);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
