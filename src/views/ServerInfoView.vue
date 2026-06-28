<template>
  <div class="server-info-view">
    <div class="view-header">
      <div class="header-content">
        <h1>Server Info</h1>
        <p class="subtitle">Server details and network health</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="fetchAll">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading && !serverInfo" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading server information...</span>
    </div>

    <template v-else>
      <div class="info-grid">
        <div class="info-card">
          <div class="card-header">
            <i class="pi pi-server" />
            <h3>Host</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">Hostname</span>
              <code>{{ serverInfo?.hostname || "—" }}</code>
            </div>
            <div class="info-row">
              <span class="info-label">Public IPv4</span>
              <code>{{ serverInfo?.public_ipv4 || "—" }}</code>
            </div>
            <div class="info-row">
              <span class="info-label">Public IPv6</span>
              <code class="ipv6">{{ serverInfo?.public_ipv6 || "—" }}</code>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="card-header">
            <i class="pi pi-globe" />
            <h3>Network Health</h3>
            <span v-if="networkHealth" class="health-pill" :class="networkHealthy ? 'healthy' : 'unhealthy'">
              {{ networkHealthy ? "Healthy" : "Issues Detected" }}
            </span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">External Access</span>
              <span class="status-badge" :class="networkHealth?.external_access ? 'ok' : 'fail'">
                <i :class="networkHealth?.external_access ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
                {{ networkHealth?.external_access ? "Reachable" : "Unreachable" }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">DNS</span>
              <span class="status-badge" :class="networkHealth?.dns?.healthy ? 'ok' : 'fail'">
                <i :class="networkHealth?.dns?.healthy ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
                {{ networkHealth?.dns?.healthy ? "Healthy" : "Degraded" }}
              </span>
            </div>
            <div v-if="networkHealth?.checked_at" class="info-row">
              <span class="info-label">Last Check</span>
              <span class="info-value">{{ formatTime(networkHealth.checked_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="networkHealth?.dns?.resolvers?.length" class="section-card">
        <div class="card-header">
          <i class="pi pi-sitemap" />
          <h3>DNS Resolvers</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Server</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="resolver in networkHealth.dns.resolvers" :key="resolver.server">
              <td>
                <code>{{ resolver.server }}</code>
              </td>
              <td>
                <span class="status-badge" :class="resolver.healthy ? 'ok' : 'fail'">
                  <i :class="resolver.healthy ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
                  {{ resolver.healthy ? "OK" : "Failed" }}
                </span>
              </td>
              <td>{{ resolver.latency_ms }}ms</td>
              <td>
                <span v-if="resolver.error" class="error-text">{{ resolver.error }}</span>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="allInterfaces.length" class="section-card">
        <div class="card-header">
          <i class="pi pi-share-alt" />
          <h3>Network Interfaces</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Interface</th>
              <th>Addresses</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="iface in allInterfaces" :key="iface.name">
              <td>
                <code>{{ iface.name }}</code>
              </td>
              <td>
                <div class="address-list">
                  <code v-for="addr in iface.addresses" :key="addr" class="address-chip">{{ addr }}</code>
                </div>
              </td>
              <td>
                <span class="muted">{{ iface.flags }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { serverApi, type ServerInfo, type NetworkHealth } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

const notifications = useNotificationsStore();
const loading = ref(false);
const serverInfo = ref<ServerInfo | null>(null);
const networkHealth = ref<NetworkHealth | null>(null);

const networkHealthy = computed(() => {
  if (!networkHealth.value) return false;
  return networkHealth.value.external_access && networkHealth.value.dns?.healthy;
});

const allInterfaces = computed(() => {
  return serverInfo.value?.interfaces || [];
});

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const fetchAll = async () => {
  loading.value = true;
  try {
    const [infoRes, healthRes] = await Promise.all([serverApi.getInfo(), serverApi.getNetworkHealth()]);
    serverInfo.value = infoRes.data.server;
    networkHealth.value = healthRes.data.network_health;
  } catch {
    notifications.error("Error", "Failed to load server information");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchAll();
});
</script>

<style scoped>
.server-info-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-raised);
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

.btn-icon {
  padding: 0.625rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--surface-inset);
  color: var(--text);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  text-align: center;
  gap: 1rem;
}

.loading-state i {
  font-size: 3rem;
  color: var(--text-subtle);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1rem;
}

.info-card,
.section-card {
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.card-header i {
  color: #3b82f6;
  font-size: 1rem;
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.health-pill {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.health-pill.healthy {
  background: #dcfce7;
  color: #166534;
}

.health-pill.unhealthy {
  background: #fee2e2;
  color: #991b1b;
}

.card-body {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.info-value {
  font-size: 0.8125rem;
  color: var(--text);
}

code {
  background: var(--surface-inset);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
  color: var(--text);
}

code.ipv6 {
  font-size: 0.6875rem;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.status-badge.ok {
  color: #16a34a;
}

.status-badge.ok i {
  color: #16a34a;
}

.status-badge.fail {
  color: #dc2626;
}

.status-badge.fail i {
  color: #dc2626;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 0.75rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: var(--text);
  border-bottom: 1px solid var(--border-subtle);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.address-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.address-chip {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
}

.error-text {
  font-size: 0.8125rem;
  color: #dc2626;
}

.muted {
  color: var(--text-subtle);
  font-size: 0.8125rem;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
