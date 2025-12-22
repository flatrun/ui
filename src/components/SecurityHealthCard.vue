<template>
  <div class="health-card">
    <div class="health-header">
      <div class="health-title">
        <i class="pi pi-shield" />
        <h4>Security Health Status</h4>
        <button class="btn btn-icon btn-sm" title="Refresh health status" @click="fetchHealth">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
      <div v-if="health" class="health-status" :class="health.status">
        <i :class="getHealthIcon(health.status)" />
        <span>{{ formatHealthStatus(health.status) }}</span>
      </div>
    </div>

    <div v-if="loading" class="health-loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Checking security health...</span>
    </div>

    <div v-else-if="health" class="health-content">
      <div v-if="Object.keys(health.checks).length > 0" class="health-checks">
        <div v-for="category in categorizedChecks" :key="category.id" class="check-category">
          <div class="category-header">
            <div class="category-title">
              <i :class="category.icon" />
              <h5>{{ category.label }}</h5>
              <span v-if="category.id === 'connectivity'" class="critical-badge">Critical</span>
            </div>
            <span class="category-status" :class="getCategoryStatus(category)">
              {{ getCategoryPassedCount(category) }}/{{ category.checks.length }}
            </span>
          </div>
          <div class="checks-grid">
            <div
              v-for="checkName in category.checks"
              :key="checkName"
              class="check-item"
              :class="{ passed: health.checks[checkName], failed: health.checks[checkName] === false }"
              :title="getCheckDescription(checkName)"
            >
              <i
                :class="
                  health.checks[checkName]
                    ? 'pi pi-check-circle'
                    : health.checks[checkName] === false
                      ? 'pi pi-times-circle'
                      : 'pi pi-minus-circle'
                "
              />
              <span>{{ formatCheckName(checkName) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="health.issues?.length > 0" class="health-issues">
        <h5>Issues Detected</h5>
        <ul class="issues-list">
          <li v-for="(issue, idx) in health.issues" :key="idx">
            <i class="pi pi-exclamation-triangle" />
            <span>{{ issue }}</span>
          </li>
        </ul>
      </div>

      <div v-if="health.recommendations?.length > 0" class="health-recommendations">
        <h5>Recommendations</h5>
        <ul class="recommendations-list">
          <li v-for="(rec, idx) in health.recommendations" :key="idx">
            <i class="pi pi-info-circle" />
            <span>{{ rec }}</span>
          </li>
        </ul>
      </div>

      <div v-if="health.details && Object.keys(health.details).length > 0" class="health-details">
        <details>
          <summary>View Details</summary>
          <pre>{{ JSON.stringify(health.details, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <div v-else class="health-empty">
      <i class="pi pi-info-circle" />
      <span>Click refresh to check security health status</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useSecurityStore } from "@/stores/security";

interface CheckCategory {
  id: string;
  label: string;
  icon: string;
  checks: string[];
}

const props = defineProps<{
  autoFetch?: boolean;
}>();

const securityStore = useSecurityStore();
const { health } = storeToRefs(securityStore);
const loading = ref(false);

const checkCategories: CheckCategory[] = [
  {
    id: "connectivity",
    label: "Connectivity",
    icon: "pi pi-wifi",
    checks: ["nginx_can_reach_agent"],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: "pi pi-cog",
    checks: [
      "security_lua_ip_injected",
      "traffic_lua_ip_injected",
      "traffic_lua_exists",
      "nginx_conf_has_traffic_module",
      "nginx_conf_has_global_traffic_logging",
    ],
  },
  {
    id: "deployments",
    label: "Deployments",
    icon: "pi pi-server",
    checks: ["vhosts_have_security_hook"],
  },
];

const checkDescriptions: Record<string, string> = {
  nginx_can_reach_agent: "Verifies nginx container can reach the agent API for logging",
  security_lua_ip_injected: "Checks if security.lua has the agent IP properly configured",
  traffic_lua_ip_injected: "Checks if traffic.lua has the agent IP properly configured",
  traffic_lua_exists: "Verifies traffic.lua exists in nginx container",
  nginx_conf_has_traffic_module: "Checks if nginx.conf loads the traffic Lua module",
  nginx_conf_has_global_traffic_logging: "Checks if global traffic logging is enabled",
  vhosts_have_security_hook: "Verifies deployments with security enabled have the security hook",
};

const categorizedChecks = computed(() => {
  if (!health.value?.checks) return [];

  return checkCategories
    .map((category) => ({
      ...category,
      checks: category.checks.filter((check) => check in health.value!.checks),
    }))
    .filter((category) => category.checks.length > 0);
});

const fetchHealth = async () => {
  loading.value = true;
  await securityStore.fetchHealth();
  loading.value = false;
};

const getHealthIcon = (status: string): string => {
  switch (status) {
    case "healthy":
      return "pi pi-check-circle";
    case "degraded":
      return "pi pi-exclamation-circle";
    case "broken":
      return "pi pi-times-circle";
    case "disabled":
      return "pi pi-minus-circle";
    default:
      return "pi pi-question-circle";
  }
};

const formatHealthStatus = (status: string): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "broken":
      return "Broken";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
};

const formatCheckName = (name: string): string => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getCheckDescription = (name: string): string => {
  return checkDescriptions[name] || formatCheckName(name);
};

const getCategoryPassedCount = (category: CheckCategory): number => {
  if (!health.value?.checks) return 0;
  return category.checks.filter((check) => health.value!.checks[check] === true).length;
};

const getCategoryStatus = (category: CheckCategory): string => {
  const passed = getCategoryPassedCount(category);
  const total = category.checks.length;
  if (passed === total) return "passed";
  if (passed === 0) return "failed";
  return "partial";
};

onMounted(() => {
  if (props.autoFetch) {
    fetchHealth();
  }
});
</script>

<style scoped>
.health-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.health-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.health-title > i:first-child {
  font-size: 1.125rem;
  color: #3b82f6;
}

.health-title h4 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.health-status.healthy {
  background: #d1fae5;
  color: #059669;
}

.health-status.degraded {
  background: #fef3c7;
  color: #d97706;
}

.health-status.broken {
  background: #fee2e2;
  color: #dc2626;
}

.health-status.disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.health-loading,
.health-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

.health-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.health-checks {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.check-category {
  padding: 1rem;
  background: #f9fafb;
  border-radius: var(--radius-sm);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-title i {
  color: #6b7280;
  font-size: 0.875rem;
}

.category-title h5 {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.critical-badge {
  padding: 0.125rem 0.375rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
}

.category-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.category-status.passed {
  background: #d1fae5;
  color: #059669;
}

.category-status.partial {
  background: #fef3c7;
  color: #d97706;
}

.category-status.failed {
  background: #fee2e2;
  color: #dc2626;
}

.health-issues h5,
.health-recommendations h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.checks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
}

.check-item.passed {
  background: #f0fdf4;
  color: #166534;
}

.check-item.passed i {
  color: #22c55e;
}

.check-item.failed {
  background: #fef2f2;
  color: #991b1b;
}

.check-item.failed i {
  color: #ef4444;
}

.issues-list,
.recommendations-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.issues-list li,
.recommendations-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.issues-list li {
  background: #fef2f2;
  color: #991b1b;
}

.issues-list li i {
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.recommendations-list li {
  background: #eff6ff;
  color: #1e40af;
}

.recommendations-list li i {
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.health-details {
  margin-top: 0.5rem;
}

.health-details summary {
  cursor: pointer;
  font-size: 0.8125rem;
  color: #6b7280;
  user-select: none;
}

.health-details summary:hover {
  color: #374151;
}

.health-details pre {
  margin: 0.75rem 0 0 0;
  padding: 1rem;
  background: #f9fafb;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  overflow-x: auto;
  color: #374151;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
}

.btn-icon {
  padding: 0.375rem;
  background: transparent;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

@media (max-width: 768px) {
  .checks-grid {
    grid-template-columns: 1fr;
  }

  .health-header {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
