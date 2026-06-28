<template>
  <div class="cluster-view">
    <div class="view-header">
      <div class="header-content">
        <h1>Cluster</h1>
        <p class="subtitle">Manage peer servers in your cluster</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="fetchAll">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading && !status" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading cluster status...</span>
    </div>

    <template v-else-if="status && !status.enabled">
      <div class="disabled-state">
        <i class="pi pi-sitemap" />
        <h3>Cluster Not Enabled</h3>
        <p>Enable clustering in your agent configuration to connect multiple servers.</p>
        <code class="config-hint"
          >cluster: enabled: true server_name: "my-server" advertise_url: "https://my-server:8090"</code
        >
      </div>
    </template>

    <template v-else-if="status">
      <div class="status-cards">
        <div class="status-card">
          <div class="status-icon blue">
            <i class="pi pi-server" />
          </div>
          <div class="status-info">
            <span class="status-value">{{ status.server_name }}</span>
            <span class="status-label">This Server</span>
          </div>
        </div>
        <div class="status-card">
          <div class="status-icon green">
            <i class="pi pi-sitemap" />
          </div>
          <div class="status-info">
            <span class="status-value">{{ status.peer_count }}</span>
            <span class="status-label">Peers</span>
          </div>
        </div>
        <div class="status-card">
          <div class="status-icon purple">
            <i class="pi pi-tag" />
          </div>
          <div class="status-info">
            <span class="status-value">{{ status.version?.version || "—" }}</span>
            <span class="status-label">Version</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="card-header">
          <div class="header-left">
            <i class="pi pi-users" />
            <h3>Peers</h3>
          </div>
          <div v-if="canWrite" class="header-right">
            <button class="btn btn-sm btn-secondary" @click="showAcceptModal = true">
              <i class="pi pi-sign-in" />
              Join Cluster
            </button>
            <button class="btn btn-sm btn-primary" :disabled="creatingInvite" @click="createInvite">
              <i :class="creatingInvite ? 'pi pi-spin pi-spinner' : 'pi pi-plus'" />
              Generate Invite
            </button>
          </div>
        </div>

        <div v-if="peers.length === 0" class="empty-peers">
          <i class="pi pi-sitemap" />
          <p>No peers connected yet</p>
          <span class="hint">Generate an invite token and share it with another server to connect</span>
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Status</th>
              <th>Connected</th>
              <th>Last Seen</th>
              <th v-if="canWrite">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="peer in peers" :key="peer.id">
              <td>
                <div class="peer-name">
                  <i class="pi pi-server" />
                  <strong>{{ peer.name }}</strong>
                </div>
              </td>
              <td>
                <code>{{ peer.url }}</code>
              </td>
              <td>
                <span class="peer-status" :class="peer.status">
                  {{ peer.status }}
                </span>
              </td>
              <td class="time-cell">{{ formatTime(peer.created_at) }}</td>
              <td class="time-cell">{{ peer.last_seen_at ? formatTime(peer.last_seen_at) : "—" }}</td>
              <td v-if="canWrite">
                <button
                  class="btn btn-sm btn-danger"
                  :disabled="removingPeer === peer.name"
                  @click="confirmRemovePeer(peer)"
                >
                  <i :class="removingPeer === peer.name ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" />
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
      <div class="modal-panel">
        <div class="modal-header">
          <h2>Invite Token</h2>
          <button class="close-btn" @click="showInviteModal = false">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">Share this token with the server you want to connect. It expires in 1 hour.</p>
          <div class="token-display">
            <code class="token-value">{{ inviteToken }}</code>
            <button class="btn btn-sm btn-secondary" @click="copyToken">
              <i class="pi pi-copy" />
              {{ copied ? "Copied" : "Copy" }}
            </button>
          </div>
          <div v-if="inviteExpiry" class="token-expiry">
            <i class="pi pi-clock" />
            Expires: {{ formatDateTime(inviteExpiry) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAcceptModal" class="modal-overlay" @click.self="showAcceptModal = false">
      <div class="modal-panel">
        <div class="modal-header">
          <h2>Join Cluster</h2>
          <button class="close-btn" @click="showAcceptModal = false">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">Enter the invite token and the URL of the server that generated it.</p>
          <div class="form-group">
            <label for="peerUrl">Peer Server URL</label>
            <input id="peerUrl" v-model="acceptForm.peerUrl" type="url" placeholder="https://other-server:8090" />
          </div>
          <div class="form-group">
            <label for="inviteTokenInput">Invite Token</label>
            <input
              id="inviteTokenInput"
              v-model="acceptForm.inviteToken"
              type="text"
              placeholder="Paste the invite token"
            />
          </div>
          <div v-if="acceptError" class="error-message">
            <i class="pi pi-exclamation-circle" />
            {{ acceptError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAcceptModal = false">Cancel</button>
          <button
            class="btn btn-primary"
            :disabled="accepting || !acceptForm.peerUrl || !acceptForm.inviteToken"
            @click="acceptInvite"
          >
            <i v-if="accepting" class="pi pi-spin pi-spinner" />
            {{ accepting ? "Connecting..." : "Connect" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRemoveModal" class="modal-overlay" @click.self="showRemoveModal = false">
      <div class="modal-panel">
        <div class="modal-header">
          <h2>Remove Peer</h2>
          <button class="close-btn" @click="showRemoveModal = false">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-body">
          <p>
            Are you sure you want to remove <strong>{{ peerToRemove?.name }}</strong> from the cluster?
          </p>
          <p class="warning-text">
            <i class="pi pi-exclamation-triangle" />
            This will disconnect the peer server. You'll need a new invite to reconnect.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRemoveModal = false">Cancel</button>
          <button class="btn btn-danger" :disabled="removingPeer !== null" @click="removePeer">
            <i v-if="removingPeer" class="pi pi-spin pi-spinner" />
            {{ removingPeer ? "Removing..." : "Remove Peer" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { clusterApi, type ClusterStatus, type ClusterPeer } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const notifications = useNotificationsStore();
const authStore = useAuthStore();
const canWrite = authStore.hasPermission("cluster:write");

const loading = ref(false);
const status = ref<ClusterStatus | null>(null);
const peers = ref<ClusterPeer[]>([]);

const showInviteModal = ref(false);
const inviteToken = ref("");
const inviteExpiry = ref("");
const creatingInvite = ref(false);
const copied = ref(false);

const showAcceptModal = ref(false);
const acceptForm = ref({ peerUrl: "", inviteToken: "" });
const accepting = ref(false);
const acceptError = ref("");

const showRemoveModal = ref(false);
const peerToRemove = ref<ClusterPeer | null>(null);
const removingPeer = ref<string | null>(null);

const fetchAll = async () => {
  loading.value = true;
  try {
    const statusRes = await clusterApi.getStatus();
    status.value = statusRes.data;

    if (status.value.enabled) {
      const peersRes = await clusterApi.listPeers();
      peers.value = peersRes.data.peers || [];
    }
  } catch {
    notifications.error("Error", "Failed to load cluster status");
  } finally {
    loading.value = false;
  }
};

const createInvite = async () => {
  creatingInvite.value = true;
  try {
    const res = await clusterApi.createInvite();
    inviteToken.value = res.data.invite_token;
    inviteExpiry.value = res.data.expires_at;
    copied.value = false;
    showInviteModal.value = true;
  } catch {
    notifications.error("Error", "Failed to generate invite token");
  } finally {
    creatingInvite.value = false;
  }
};

const copyToken = async () => {
  await navigator.clipboard.writeText(inviteToken.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const acceptInvite = async () => {
  accepting.value = true;
  acceptError.value = "";
  try {
    const res = await clusterApi.acceptInvite(acceptForm.value.inviteToken, acceptForm.value.peerUrl);
    notifications.success("Connected", `Peer "${res.data.peer_name}" joined the cluster`);
    showAcceptModal.value = false;
    acceptForm.value = { peerUrl: "", inviteToken: "" };
    await fetchAll();
  } catch (e: any) {
    acceptError.value = e.response?.data?.error || "Failed to connect to peer";
  } finally {
    accepting.value = false;
  }
};

const confirmRemovePeer = (peer: ClusterPeer) => {
  peerToRemove.value = peer;
  showRemoveModal.value = true;
};

const removePeer = async () => {
  if (!peerToRemove.value) return;
  removingPeer.value = peerToRemove.value.name;
  try {
    await clusterApi.removePeer(peerToRemove.value.name);
    notifications.success("Removed", `Peer "${peerToRemove.value.name}" has been removed`);
    showRemoveModal.value = false;
    peerToRemove.value = null;
    await fetchAll();
  } catch {
    notifications.error("Error", "Failed to remove peer");
  } finally {
    removingPeer.value = null;
  }
};

const formatTime = (iso: string) => {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

onMounted(() => {
  fetchAll();
});
</script>

<style scoped>
.cluster-view {
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

.loading-state,
.disabled-state {
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

.loading-state i,
.disabled-state i {
  font-size: 3rem;
  color: var(--text-subtle);
}

.disabled-state h3 {
  font-size: 1.125rem;
  color: var(--text);
  margin: 0;
}

.disabled-state p {
  color: var(--text-muted);
  margin: 0;
}

.config-hint {
  display: block;
  text-align: left;
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre;
  font-family: "SF Mono", "Fira Code", monospace;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.status-card {
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.status-icon.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-icon.green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-icon.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.status-label {
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.section-card {
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.header-left i {
  color: #3b82f6;
  font-size: 1rem;
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.empty-peers {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  text-align: center;
  gap: 0.5rem;
}

.empty-peers i {
  font-size: 2.5rem;
  color: var(--border);
}

.empty-peers p {
  color: var(--text-muted);
  margin: 0;
  font-weight: 500;
}

.empty-peers .hint {
  font-size: 0.8125rem;
  color: var(--text-subtle);
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

.peer-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.peer-name i {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.peer-status {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.peer-status.active,
.peer-status.peered {
  background: #dcfce7;
  color: #166534;
}

.peer-status.unreachable {
  background: #fee2e2;
  color: #991b1b;
}

.peer-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.time-cell {
  color: var(--text-subtle);
  font-size: 0.75rem;
}

code {
  background: var(--surface-inset);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
  color: var(--text);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-sunken);
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  background: #fecaca;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-panel {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  color: var(--text);
  background: var(--surface-inset);
}

.modal-body {
  padding: 1.5rem;
}

.modal-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.token-value {
  flex: 1;
  font-size: 0.75rem;
  word-break: break-all;
  background: transparent;
  padding: 0;
}

.token-expiry {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-subtle);
  margin-top: 0.75rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.375rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text);
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #92400e;
  background: #fef3c7;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-sm);
  margin-top: 0.75rem;
}

.warning-text i {
  flex-shrink: 0;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .status-cards {
    grid-template-columns: 1fr;
  }

  .header-right {
    flex-direction: column;
  }
}
</style>
