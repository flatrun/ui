<template>
  <div class="networks-view">
    <DataTable
      :items="networks"
      :columns="columns"
      item-key="id"
      :loading="loading"
      :searchable="true"
      :search-placeholder="$t('networks.searchPlaceholder')"
      :search-fields="['name', 'driver', 'scope']"
      :toggleable="true"
      default-view-mode="grid"
      empty-icon="pi pi-share-alt"
      :empty-title="$t('networks.empty.title')"
      :empty-text="$t('networks.empty.text')"
      :loading-text="$t('networks.loading')"
    >
      <template #actions>
        <button v-if="canWrite" class="btn btn-primary" @click="showCreateModal = true">
          <i class="pi pi-plus" />
          {{ $t("networks.actions.createNetwork") }}
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchNetworks">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </template>

      <template #empty-action>
        <button v-if="canWrite" class="btn btn-primary" @click="showCreateModal = true">
          <i class="pi pi-plus" />
          {{ $t("networks.actions.createNetwork") }}
        </button>
      </template>

      <template #cell-name="{ item }">
        <span class="name-cell" :class="{ 'system-network': isSystemNetwork(item.name) }">
          {{ item.name }}
        </span>
      </template>

      <template #cell-id="{ item }">
        <span class="id-cell">{{ item.id }}</span>
      </template>

      <template #cell-containers="{ item }">
        {{ item.containers?.length || 0 }}
      </template>

      <template #cell-actions="{ item }">
        <div class="table-actions">
          <button
            v-if="canWrite && !isSystemNetwork(item.name)"
            class="btn-icon-xs"
            :title="$t('networks.actions.connectContainer')"
            @click="openConnectModal(item)"
          >
            <i class="pi pi-link" />
          </button>
          <button
            v-if="canDelete && !isSystemNetwork(item.name)"
            class="btn-icon-xs danger"
            :title="$t('networks.actions.delete')"
            @click="confirmDelete(item)"
          >
            <i class="pi pi-trash" />
          </button>
        </div>
      </template>

      <template #grid="{ items }">
        <div class="networks-grid">
          <div
            v-for="network in items"
            :key="network.id"
            class="network-card"
            :class="{ 'system-network': isSystemNetwork(network.name) }"
          >
            <div class="network-header">
              <div class="network-info">
                <h4>{{ network.name }}</h4>
                <span class="network-id">{{ network.id }}</span>
              </div>
              <div v-if="canDelete && !isSystemNetwork(network.name)" class="network-actions">
                <button
                  class="btn-icon-sm danger"
                  :title="$t('networks.actions.deleteNetwork')"
                  @click="confirmDelete(network)"
                >
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>

            <div class="network-body">
              <div class="network-meta">
                <div class="meta-item">
                  <span class="meta-label">{{ $t("networks.table.driver") }}</span>
                  <span class="meta-value">{{ network.driver }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ $t("networks.table.scope") }}</span>
                  <span class="meta-value">{{ network.scope }}</span>
                </div>
                <div v-if="network.subnet" class="meta-item">
                  <span class="meta-label">{{ $t("networks.table.subnet") }}</span>
                  <span class="meta-value">{{ network.subnet }}</span>
                </div>
                <div v-if="network.gateway" class="meta-item">
                  <span class="meta-label">{{ $t("networks.table.gateway") }}</span>
                  <span class="meta-value">{{ network.gateway }}</span>
                </div>
              </div>

              <div class="containers-section">
                <div class="containers-header">
                  <span class="containers-title">
                    <i class="pi pi-box" />
                    {{ $t("networks.connectedContainers", { n: network.containers?.length || 0 }) }}
                  </span>
                  <button
                    v-if="canWrite && !isSystemNetwork(network.name)"
                    class="btn-text"
                    @click="openConnectModal(network)"
                  >
                    <i class="pi pi-link" />
                    {{ $t("networks.actions.connect") }}
                  </button>
                </div>

                <div v-if="network.containers?.length > 0" class="containers-list">
                  <div v-for="container in network.containers" :key="container.name" class="container-item">
                    <div class="container-info">
                      <span class="container-name">{{ container.name }}</span>
                      <span class="container-ip">{{ container.ipv4 }}</span>
                    </div>
                    <button
                      v-if="canWrite && !isSystemNetwork(network.name)"
                      class="btn-icon-xs"
                      :title="$t('networks.actions.disconnect')"
                      @click="disconnectContainer(network.name, container.name)"
                    >
                      <i class="pi pi-times" />
                    </button>
                  </div>
                </div>
                <div v-else class="no-containers">{{ $t("networks.empty.noContainersConnected") }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-plus-circle" />
              {{ $t("networks.create.title") }}
            </h3>
            <button class="close-btn" @click="showCreateModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>{{ $t("networks.create.name") }}</label>
              <input
                v-model="newNetwork.name"
                type="text"
                :placeholder="$t('networks.create.namePlaceholder')"
                :class="{ error: createErrors.name }"
              />
              <span v-if="createErrors.name" class="error-text">{{ createErrors.name }}</span>
            </div>
            <div class="form-group">
              <label>{{ $t("networks.table.driver") }}</label>
              <select v-model="newNetwork.driver">
                <option value="bridge">{{ $t("networks.drivers.bridge") }}</option>
                <option value="overlay">{{ $t("networks.drivers.overlay") }}</option>
                <option value="host">{{ $t("networks.drivers.host") }}</option>
                <option value="none">{{ $t("networks.drivers.none") }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateModal = false">
              {{ $t("networks.create.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="creating" @click="createNetwork">
              <i v-if="creating" class="pi pi-spin pi-spinner" />
              {{ creating ? $t("networks.create.creating") : $t("networks.create.create") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showConnectModal" class="modal-overlay" @click.self="showConnectModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-link" />
              {{ $t("networks.connect.title", { name: selectedNetwork?.name || "" }) }}
            </h3>
            <button class="close-btn" @click="showConnectModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>{{ $t("networks.connect.containerName") }}</label>
              <input
                v-model="containerToConnect"
                type="text"
                :placeholder="$t('networks.connect.containerPlaceholder')"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showConnectModal = false">
              {{ $t("networks.connect.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="connecting" @click="connectContainer">
              <i v-if="connecting" class="pi pi-spin pi-spinner" />
              {{ connecting ? $t("networks.connect.connecting") : $t("networks.actions.connect") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h3>
              <i class="pi pi-exclamation-triangle" style="color: #ef4444" />
              {{ $t("networks.delete.title") }}
            </h3>
          </div>
          <div class="modal-body">
            <p>
              {{ $t("networks.delete.confirm") }}
              <strong>{{ networkToDelete?.name }}</strong
              >?
            </p>
            <p class="warning-text">{{ $t("networks.delete.warning") }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteModal = false">
              {{ $t("networks.delete.cancel") }}
            </button>
            <button class="btn btn-danger" :disabled="deleting" @click="deleteNetwork">
              <i v-if="deleting" class="pi pi-spin pi-spinner" />
              {{ deleting ? $t("networks.delete.deleting") : $t("networks.actions.delete") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { networksApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import DataTable from "@/components/DataTable.vue";
import type { Network } from "@/types";

const notifications = useNotificationsStore();
const { t } = useI18n();
const authStore = useAuthStore();
const canWrite = authStore.hasPermission("networks:write");
const canDelete = authStore.hasPermission("networks:delete");
const networks = ref<Network[]>([]);
const loading = ref(false);

const columns = computed(() => [
  { key: "name", label: t("networks.table.name"), sortable: true },
  { key: "id", label: t("networks.table.id") },
  { key: "driver", label: t("networks.table.driver"), sortable: true },
  { key: "scope", label: t("networks.table.scope"), sortable: true },
  { key: "subnet", label: t("networks.table.subnet") },
  { key: "containers", label: t("networks.table.containers") },
  { key: "actions", label: t("networks.table.actions"), width: "100px" },
]);

const showCreateModal = ref(false);
const showConnectModal = ref(false);
const showDeleteModal = ref(false);
const creating = ref(false);
const connecting = ref(false);
const deleting = ref(false);

const selectedNetwork = ref<Network | null>(null);
const networkToDelete = ref<Network | null>(null);
const containerToConnect = ref("");

const newNetwork = reactive({
  name: "",
  driver: "bridge",
});

const createErrors = reactive({
  name: "",
});

const systemNetworks = ["bridge", "host", "none"];

const isSystemNetwork = (name: string) => systemNetworks.includes(name);

const fetchNetworks = async () => {
  loading.value = true;

  try {
    const response = await networksApi.list();
    networks.value = response.data.networks || [];
  } catch (e: any) {
    notifications.error(t("common.error"), t("networks.notifications.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const createNetwork = async () => {
  createErrors.name = "";

  if (!newNetwork.name.trim()) {
    createErrors.name = t("networks.validation.nameRequired");
    return;
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(newNetwork.name)) {
    createErrors.name = t("networks.validation.invalidName");
    return;
  }

  creating.value = true;

  try {
    await networksApi.create({
      name: newNetwork.name,
      driver: newNetwork.driver,
    });
    notifications.success(t("common.success"), t("networks.notifications.created", { name: newNetwork.name }));
    showCreateModal.value = false;
    newNetwork.name = "";
    newNetwork.driver = "bridge";
    await fetchNetworks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("networks.notifications.createFailed"), msg);
  } finally {
    creating.value = false;
  }
};

const confirmDelete = (network: Network) => {
  networkToDelete.value = network;
  showDeleteModal.value = true;
};

const deleteNetwork = async () => {
  if (!networkToDelete.value) return;

  deleting.value = true;

  try {
    await networksApi.delete(networkToDelete.value.name);
    notifications.success(
      t("common.success"),
      t("networks.notifications.deleted", { name: networkToDelete.value.name }),
    );
    showDeleteModal.value = false;
    networkToDelete.value = null;
    await fetchNetworks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("networks.notifications.deleteFailed"), msg);
  } finally {
    deleting.value = false;
  }
};

const openConnectModal = (network: Network) => {
  selectedNetwork.value = network;
  containerToConnect.value = "";
  showConnectModal.value = true;
};

const connectContainer = async () => {
  if (!selectedNetwork.value || !containerToConnect.value.trim()) return;

  connecting.value = true;

  try {
    await networksApi.connect(selectedNetwork.value.name, containerToConnect.value);
    notifications.success(
      t("common.success"),
      t("networks.notifications.connected", { name: selectedNetwork.value.name }),
    );
    showConnectModal.value = false;
    await fetchNetworks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("networks.notifications.connectFailed"), msg);
  } finally {
    connecting.value = false;
  }
};

const disconnectContainer = async (networkName: string, containerName: string) => {
  try {
    await networksApi.disconnect(networkName, containerName);
    notifications.success(t("common.success"), t("networks.notifications.disconnected", { name: networkName }));
    await fetchNetworks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("networks.notifications.disconnectFailed"), msg);
  }
};

onMounted(() => {
  fetchNetworks();
});
</script>

<style scoped>
.networks-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-icon {
  padding: 0.625rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon-sm {
  padding: 0.375rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.btn-icon-sm:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-icon-sm.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-icon-xs {
  padding: 0.25rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.btn-icon-xs:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-icon-xs.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-text {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s;
}

.btn-text:hover {
  color: #2563eb;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.name-cell {
  font-weight: 600;
  color: #1f2937;
}

.name-cell.system-network {
  opacity: 0.7;
}

.id-cell {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #9ca3af;
}

.networks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.network-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.network-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.network-card.system-network {
  border-color: #d1d5db;
  opacity: 0.8;
}

.network-header {
  padding: 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.network-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
}

.network-id {
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: "SF Mono", "Fira Code", monospace;
}

.network-body {
  padding: 1.25rem;
}

.network-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.meta-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.8125rem;
  color: #1f2937;
  font-weight: 500;
}

.containers-section {
  background: #f9fafb;
  border-radius: var(--radius-sm);
  padding: 1rem;
}

.containers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.containers-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.containers-title i {
  color: #6b7280;
}

.containers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.container-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.container-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.container-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #1f2937;
}

.container-ip {
  font-size: 0.6875rem;
  color: #6b7280;
  font-family: "SF Mono", "Fira Code", monospace;
}

.no-containers {
  font-size: 0.8125rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-container {
  background: white;
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 500px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-sm {
  max-width: 400px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-header h3 i {
  color: #3b82f6;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.warning-text {
  color: #dc2626;
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.error {
  border-color: #ef4444;
}

.error-text {
  display: block;
  font-size: 0.8125rem;
  color: #ef4444;
  margin-top: 0.375rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .networks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
