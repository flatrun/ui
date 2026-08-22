<template>
  <div class="cluster-view">
    <ContextBanner id="fleet" icon="network">
      Connecting a server does not move existing deployments. It adds that server to this management view.
      <template #actions>
        <BaseButton size="sm" variant="ghost" icon="refresh-cw" :loading="loading" @click="fetchAll">
          Refresh
        </BaseButton>
      </template>
    </ContextBanner>

    <div v-if="loading && !status" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading cluster status...</span>
    </div>

    <template v-else-if="status && !status.enabled">
      <div class="disabled-state">
        <div class="disabled-icon"><Icon name="solar:global-bold-duotone" :size="32" /></div>
        <span class="status-chip">Not configured</span>
        <h3>Manage every server from one place</h3>
        <p>Enable Fleet on this server, then invite another server. Existing deployments keep running unchanged.</p>
        <BaseButton v-if="canWrite" variant="primary" icon="network" @click="openSetupModal">Set up Fleet</BaseButton>
      </div>
    </template>

    <template v-else-if="status">
      <div class="section-card">
        <div class="card-header">
          <div class="fleet-heading">
            <div class="header-left">
              <Icon name="solar:server-square-cloud-bold-duotone" :size="22" />
              <div>
                <h3>Fleet servers</h3>
                <p>Connected servers remain independent until you grant access.</p>
              </div>
            </div>
            <div class="fleet-meta" aria-label="Fleet status">
              <span
                ><strong>{{ status.server_name }}</strong> this server</span
              >
              <span>{{ status.peer_count }} peers</span>
              <span v-if="providers">{{ providerLabel(activeOrchestrator) }} · {{ providerLabel(activeRouting) }}</span>
              <span v-else-if="loadingProviders"><Icon name="loader-circle" spin :size="13" /> Runtime</span>
            </div>
          </div>
          <div v-if="canWrite" class="header-right">
            <BaseButton size="sm" icon="settings" @click="openProvidersModal">Runtime</BaseButton>
            <BaseButton size="sm" icon="log-in" @click="showAcceptModal = true">Join Fleet</BaseButton>
            <BaseButton size="sm" variant="primary" icon="plus" :loading="creatingInvite" @click="createInvite">
              Invite server
            </BaseButton>
          </div>
        </div>

        <div v-if="peers.length === 0" class="empty-peers">
          <i class="pi pi-sitemap" />
          <p>No peers connected yet</p>
          <span class="hint">Invite another server to manage it from this Fleet.</span>
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="peer in peers" :key="peer.name">
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
                <span class="peer-status" :class="peer.online ? 'active' : 'offline'">
                  {{ peer.online ? "online" : "offline" }}
                </span>
              </td>
              <td class="time-cell">{{ peer.last_seen ? formatTime(peer.last_seen) : "—" }}</td>
              <td>
                <div class="peer-actions">
                  <BaseButton size="sm" icon="layers" :disabled="!peer.online" @click="openPeerDeployments(peer)">
                    Deployments
                  </BaseButton>
                  <button v-if="canWrite" class="btn btn-sm btn-secondary" @click="openPolicyModal(peer)">
                    <Icon name="shield-check" :size="14" />
                    Access
                  </button>
                  <button
                    v-if="canWrite"
                    class="btn btn-sm btn-danger"
                    :disabled="removingPeer === peer.name"
                    @click="confirmRemovePeer(peer)"
                  >
                    <i :class="removingPeer === peer.name ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" />
                    Remove
                  </button>
                </div>
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

    <BaseModal
      :visible="showSetupModal"
      title="Set up FlatRun Fleet"
      subtitle="Give this server a stable identity that other servers can reach."
      icon="solar:global-bold-duotone"
      size="md"
      @close="closeSetupModal"
    >
      <form id="fleet-setup-form" class="setup-form" @submit.prevent="setupFleet">
        <div class="setup-note">
          <Icon name="solar:check-circle-bold" :size="20" />
          <div><strong>No deployment downtime</strong><span>Setup changes fleet access only.</span></div>
        </div>
        <label for="fleet-server-name">Server name</label>
        <input
          id="fleet-server-name"
          v-model.trim="setupForm.serverName"
          class="form-input"
          autocomplete="off"
          placeholder="prod-1"
          required
        />
        <span class="field-help">Use a short name that identifies this server throughout the fleet.</span>
        <label for="fleet-advertise-url">Server URL</label>
        <input
          id="fleet-advertise-url"
          v-model.trim="setupForm.advertiseUrl"
          class="form-input"
          type="url"
          placeholder="https://prod-1.example.com:8090"
          required
        />
        <span class="field-help">Other servers must be able to reach the agent at this HTTPS URL.</span>
        <div v-if="setupError" class="setup-error">
          <Icon name="solar:danger-triangle-bold" :size="18" />{{ setupError }}
        </div>
      </form>
      <template #footer>
        <BaseButton @click="closeSetupModal">Cancel</BaseButton>
        <BaseButton
          form="fleet-setup-form"
          type="submit"
          variant="primary"
          :loading="settingUp"
          :disabled="!setupForm.serverName || !setupForm.advertiseUrl"
          >Enable Fleet</BaseButton
        >
      </template>
    </BaseModal>

    <BaseModal
      :visible="showProvidersModal"
      title="Runtime providers"
      subtitle="Only providers ready on this server can be selected."
      icon="settings"
      size="lg"
      @close="closeProvidersModal"
    >
      <form id="provider-form" class="provider-form" @submit.prevent="saveProviders">
        <fieldset>
          <legend>Workload runtime</legend>
          <p>Controls where Fleet creates and scales application replicas.</p>
          <label
            v-for="provider in providers?.orchestrators"
            :key="provider.id"
            class="provider-option"
            :class="{
              selected: selectedOrchestrator === provider.id,
              unavailable: !provider.available && provider.id !== 'k3s',
            }"
          >
            <input
              v-model="selectedOrchestrator"
              type="radio"
              name="orchestrator"
              :value="provider.id"
              :disabled="!provider.available && provider.id !== 'k3s'"
            />
            <span class="provider-option-icon"><Icon :name="providerIcon(provider.id)" :size="20" /></span>
            <span class="provider-option-copy">
              <strong>{{ providerLabel(provider.id) }}</strong>
              <small>{{ providerDescription(provider.id) }}</small>
              <small v-if="provider.reason" class="provider-reason">{{ provider.reason }}</small>
            </span>
            <span v-if="provider.active" class="active-chip">Active</span>
          </label>
        </fieldset>
        <fieldset v-if="selectedOrchestrator === 'k3s'" class="provider-connection">
          <legend>K3s connection</legend>
          <p>Choose the cluster context and namespace FlatRun will manage.</p>
          <div class="provider-fields">
            <label for="provider-kubeconfig">
              <span>Kubeconfig path</span>
              <input
                id="provider-kubeconfig"
                v-model.trim="k3sForm.kubeconfig"
                class="form-input"
                type="text"
                placeholder="/etc/rancher/k3s/k3s.yaml"
                required
              />
              <small>Use a path available to the FlatRun agent service.</small>
            </label>
            <label for="provider-namespace">
              <span>Namespace</span>
              <input
                id="provider-namespace"
                v-model.trim="k3sForm.namespace"
                class="form-input"
                type="text"
                placeholder="default"
                required
              />
              <small>FlatRun workloads will be created only in this namespace.</small>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Traffic routing</legend>
          <p>Controls how incoming requests reach healthy replicas.</p>
          <label
            v-for="provider in providers?.routing"
            :key="provider.id"
            class="provider-option"
            :class="{ selected: selectedRouting === provider.id, unavailable: !provider.available }"
          >
            <input
              v-model="selectedRouting"
              type="radio"
              name="routing"
              :value="provider.id"
              :disabled="!provider.available"
            />
            <span class="provider-option-icon"><Icon :name="providerIcon(provider.id)" :size="20" /></span>
            <span class="provider-option-copy">
              <strong>{{ providerLabel(provider.id) }}</strong>
              <small>{{ providerDescription(provider.id) }}</small>
              <small v-if="provider.reason" class="provider-reason">{{ provider.reason }}</small>
            </span>
            <span v-if="provider.active" class="active-chip">Active</span>
          </label>
        </fieldset>
        <div v-if="providerError" class="setup-error">
          <Icon name="solar:danger-triangle-bold" :size="18" />{{ providerError }}
        </div>
      </form>
      <template #footer>
        <BaseButton @click="closeProvidersModal">Cancel</BaseButton>
        <BaseButton
          form="provider-form"
          type="submit"
          variant="primary"
          :loading="savingProviders"
          :disabled="!selectedOrchestrator || !selectedRouting"
          >Save providers</BaseButton
        >
      </template>
    </BaseModal>

    <BaseModal
      :visible="showPolicyModal"
      :title="policyPeer ? `Access for ${policyPeer.name}` : 'Peer access'"
      subtitle="Choose exactly what this server may do here."
      icon="shield-check"
      size="lg"
      @close="closePolicyModal"
    >
      <div v-if="loadingPolicy" class="policy-loading">
        <Icon name="loader-circle" spin :size="22" /> Loading access policy
      </div>
      <form v-else id="peer-policy-form" class="policy-form" @submit.prevent="savePolicy">
        <label v-for="option in capabilityOptions" :key="option.id" class="capability-row">
          <input v-model="selectedCapabilities" type="checkbox" :value="option.id" />
          <span class="capability-icon"><Icon :name="option.icon" :size="18" /></span>
          <span
            ><strong>{{ option.label }}</strong
            ><small>{{ option.description }}</small></span
          >
        </label>
        <div v-if="hasDeploymentAccess" class="policy-fields">
          <label for="policy-deployments">Deployment scope</label>
          <input
            id="policy-deployments"
            v-model.trim="policyForm.deployments"
            class="form-input"
            placeholder="Leave empty for every deployment"
          />
          <span class="field-help">Enter deployment names separated by commas.</span>
        </div>
        <div v-if="selectedCapabilities.includes('capacity.offer')" class="policy-fields lending-fields">
          <div>
            <label for="policy-cpu">CPU limit</label>
            <input
              id="policy-cpu"
              v-model.number="policyForm.maxCPU"
              class="form-input"
              type="number"
              min="0"
              step="0.25"
            />
          </div>
          <div>
            <label for="policy-memory">Memory limit (GB)</label>
            <input
              id="policy-memory"
              v-model.number="policyForm.maxMemoryGB"
              class="form-input"
              type="number"
              min="0"
              step="0.25"
            />
          </div>
          <div>
            <label for="policy-replicas">Replica limit</label>
            <input
              id="policy-replicas"
              v-model.number="policyForm.maxReplicas"
              class="form-input"
              type="number"
              min="0"
              step="1"
            />
          </div>
        </div>
        <div v-if="policyError" class="setup-error">
          <Icon name="solar:danger-triangle-bold" :size="18" />{{ policyError }}
        </div>
      </form>
      <template #footer>
        <BaseButton @click="closePolicyModal">Cancel</BaseButton>
        <BaseButton
          form="peer-policy-form"
          type="submit"
          variant="primary"
          :loading="savingPolicy"
          :disabled="loadingPolicy"
          >Save access</BaseButton
        >
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  clusterApi,
  serverApi,
  type ClusterCapability,
  type ClusterGrant,
  type ClusterProviders,
  type ClusterStatus,
  type ClusterPeer,
  type ServerInfo,
} from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import Icon from "@/components/base/Icon.vue";
import ContextBanner from "@/components/base/ContextBanner.vue";

const notifications = useNotificationsStore();
const router = useRouter();
const authStore = useAuthStore();
const canWrite = authStore.hasPermission("cluster:write");
const reviewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("review") : null;
const reviewProviders: ClusterProviders = {
  orchestrators: [
    { id: "standalone", active: false, available: true },
    { id: "swarm", active: true, available: true },
    { id: "k3s", active: false, available: false, reason: "k3s adapter is not configured" },
  ],
  routing: [
    { id: "nginx", active: true, available: true },
    { id: "traefik", active: false, available: false, reason: "Traefik adapter is not configured" },
  ],
  k3s: { kubeconfig: "/etc/rancher/k3s/k3s.yaml", namespace: "flatrun" },
};

const loading = ref(false);
const status = ref<ClusterStatus | null>(null);
const peers = ref<ClusterPeer[]>([]);
const showSetupModal = ref(false);
const settingUp = ref(false);
const setupError = ref("");
const setupForm = ref({ serverName: "", advertiseUrl: "" });
const serverInfo = ref<ServerInfo | null>(null);
const providers = ref<ClusterProviders | null>(null);
const loadingProviders = ref(false);
const showProvidersModal = ref(false);
const savingProviders = ref(false);
const providerError = ref("");
const selectedOrchestrator = ref("");
const selectedRouting = ref("");
const k3sForm = ref({ kubeconfig: "", namespace: "default" });
const activeOrchestrator = computed(() => providers.value?.orchestrators.find((provider) => provider.active)?.id || "");
const activeRouting = computed(() => providers.value?.routing.find((provider) => provider.active)?.id || "");

watch(selectedOrchestrator, (orchestrator) => {
  if (orchestrator === "k3s") selectedRouting.value = "traefik";
  if (orchestrator === "swarm" || orchestrator === "standalone") selectedRouting.value = "nginx";
});

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
const showPolicyModal = ref(false);
const policyPeer = ref<ClusterPeer | null>(null);
const loadingPolicy = ref(false);
const savingPolicy = ref(false);
const policyError = ref("");
const selectedCapabilities = ref<ClusterCapability[]>([]);
const policyForm = ref({ deployments: "", maxCPU: 0, maxMemoryGB: 0, maxReplicas: 0 });
const capabilityOptions: Array<{ id: ClusterCapability; label: string; description: string; icon: string }> = [
  { id: "fleet.read", label: "View Fleet", description: "See server status and connected peers.", icon: "network" },
  {
    id: "deployments.read",
    label: "View deployments",
    description: "Inspect deployments and containers.",
    icon: "eye",
  },
  {
    id: "deployments.run",
    label: "Operate deployments",
    description: "Start, stop, and restart allowed deployments.",
    icon: "play",
  },
  { id: "capacity.read", label: "View capacity", description: "Read host headroom and scaling policy.", icon: "gauge" },
  {
    id: "capacity.offer",
    label: "Borrow resources",
    description: "Place temporary replicas within the limits below.",
    icon: "cpu",
  },
  { id: "events.publish", label: "Publish events", description: "Send Fleet events to this server.", icon: "bell" },
  {
    id: "routing.manage",
    label: "Manage routing",
    description: "Update load-balancer routes for Fleet workloads.",
    icon: "route",
  },
];
const hasDeploymentAccess = computed(
  () =>
    selectedCapabilities.value.includes("deployments.read") || selectedCapabilities.value.includes("deployments.run"),
);

const fetchAll = async () => {
  loading.value = true;
  if (reviewMode === "setup") {
    status.value = { enabled: false };
    serverInfo.value = {
      hostname: "prod-1",
      agent_url: "https://prod-1.example.com",
      public_ipv4: "203.0.113.10",
      public_ipv6: "",
      interfaces: [],
    };
    loading.value = false;
    return;
  }
  if (reviewMode === "fleet") {
    status.value = {
      enabled: true,
      server_name: "prod-1",
      peer_count: 2,
      version: { version: "0.4.0-beta.4", build_time: "", git_commit: "" },
    };
    peers.value = [
      { name: "prod-2", url: "https://prod-2.example.com", online: true, last_seen: new Date().toISOString() },
      {
        name: "edge-1",
        url: "https://edge-1.example.com",
        online: false,
        last_seen: new Date(Date.now() - 18 * 60_000).toISOString(),
        error: "Connection timed out",
      },
    ];
    providers.value = structuredClone(reviewProviders);
    loading.value = false;
    return;
  }
  try {
    const statusRes = await clusterApi.getStatus();
    status.value = statusRes.data;

    if (status.value.enabled) {
      const [peersRes] = await Promise.all([clusterApi.listPeers(), loadProviders()]);
      peers.value = peersRes.data.peers || [];
    } else {
      serverInfo.value = (await serverApi.getInfo()).data.server;
    }
  } catch {
    notifications.error("Error", "Failed to load cluster status");
  } finally {
    loading.value = false;
  }
};

const openSetupModal = () => {
  if (!setupForm.value.serverName) setupForm.value.serverName = serverInfo.value?.hostname || "";
  if (!setupForm.value.advertiseUrl) setupForm.value.advertiseUrl = serverInfo.value?.agent_url || "";
  showSetupModal.value = true;
};

const openPeerDeployments = (peer: ClusterPeer) => {
  if (!peer.online) return;
  router.push({
    path: "/deployments",
    query: { server: peer.name, ...(reviewMode === "fleet" ? { review: "fleet-deployments" } : {}) },
  });
};

const loadProviders = async () => {
  loadingProviders.value = true;
  if (reviewMode === "fleet") {
    providers.value = structuredClone(reviewProviders);
    loadingProviders.value = false;
    return;
  }
  try {
    providers.value = (await clusterApi.getProviders()).data;
  } catch {
    providers.value = null;
  } finally {
    loadingProviders.value = false;
  }
};

const openProvidersModal = () => {
  selectedOrchestrator.value = activeOrchestrator.value;
  selectedRouting.value = activeRouting.value;
  k3sForm.value = {
    kubeconfig: providers.value?.k3s.kubeconfig || "",
    namespace: providers.value?.k3s.namespace || "default",
  };
  providerError.value = "";
  showProvidersModal.value = true;
};

const closeProvidersModal = () => {
  if (savingProviders.value) return;
  showProvidersModal.value = false;
  providerError.value = "";
};

const saveProviders = async () => {
  savingProviders.value = true;
  providerError.value = "";
  try {
    if (reviewMode === "fleet" && providers.value) {
      providers.value.orchestrators.forEach(
        (provider) => (provider.active = provider.id === selectedOrchestrator.value),
      );
      providers.value.routing.forEach((provider) => (provider.active = provider.id === selectedRouting.value));
      notifications.success("Review updated", "The preview now uses the selected providers.");
      showProvidersModal.value = false;
      return;
    }
    await clusterApi.updateProviders(selectedOrchestrator.value, selectedRouting.value, k3sForm.value);
    await loadProviders();
    notifications.success("Providers updated", "Fleet will use the selected runtime and traffic router.");
    showProvidersModal.value = false;
  } catch (error: any) {
    providerError.value = error.response?.data?.error || error.message || "Provider update failed";
  } finally {
    savingProviders.value = false;
  }
};

const providerLabels: Record<string, string> = {
  standalone: "Standalone Docker",
  swarm: "Docker Swarm",
  k3s: "k3s",
  nginx: "Nginx",
  traefik: "Traefik",
};
const providerLabel = (id: string) => providerLabels[id] || id;

const providerDescriptions: Record<string, string> = {
  standalone: "Keep workloads on this server.",
  swarm: "Place and scale workloads across a Docker Swarm.",
  k3s: "Place and scale workloads across a lightweight Kubernetes cluster.",
  nginx: "Route traffic through the existing FlatRun Nginx proxy.",
  traefik: "Route traffic through Traefik service discovery.",
};
const providerDescription = (id: string) => providerDescriptions[id] || "";

const providerIcons: Record<string, string> = {
  standalone: "server",
  swarm: "boxes",
  k3s: "ship-wheel",
  nginx: "route",
  traefik: "network",
};
const providerIcon = (id: string) => providerIcons[id] || "settings";

const closeSetupModal = () => {
  if (settingUp.value) return;
  showSetupModal.value = false;
  setupError.value = "";
};

const setupFleet = async () => {
  settingUp.value = true;
  setupError.value = "";
  try {
    status.value = (await clusterApi.setup(setupForm.value.serverName, setupForm.value.advertiseUrl)).data;
    notifications.success("Fleet enabled", `${setupForm.value.serverName} is ready to connect to other servers.`);
    showSetupModal.value = false;
    await fetchAll();
  } catch (error: any) {
    setupError.value = error.response?.data?.error || error.message || "Fleet setup failed";
  } finally {
    settingUp.value = false;
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

const openPolicyModal = async (peer: ClusterPeer) => {
  policyPeer.value = peer;
  showPolicyModal.value = true;
  loadingPolicy.value = true;
  policyError.value = "";
  if (reviewMode === "fleet") {
    selectedCapabilities.value = [
      "fleet.read",
      "deployments.read",
      "deployments.run",
      "capacity.read",
      "capacity.offer",
    ];
    policyForm.value = { deployments: "shop, api", maxCPU: 4, maxMemoryGB: 8, maxReplicas: 3 };
    loadingPolicy.value = false;
    return;
  }
  try {
    const { data } = await clusterApi.getPeerPolicy(peer.name);
    selectedCapabilities.value = data.grants.map((grant) => grant.capability);
    const deploymentGrant = data.grants.find(
      (grant) => grant.capability === "deployments.run" || grant.capability === "deployments.read",
    );
    const lendingGrant = data.grants.find((grant) => grant.capability === "capacity.offer");
    policyForm.value = {
      deployments: deploymentGrant?.deployments?.join(", ") || "",
      maxCPU: lendingGrant?.max_cpu || 0,
      maxMemoryGB: lendingGrant?.max_memory ? lendingGrant.max_memory / 1024 ** 3 : 0,
      maxReplicas: lendingGrant?.max_replicas || 0,
    };
  } catch (error: any) {
    policyError.value = error.response?.data?.error || error.message;
  } finally {
    loadingPolicy.value = false;
  }
};

const closePolicyModal = () => {
  if (savingPolicy.value) return;
  showPolicyModal.value = false;
  policyPeer.value = null;
  policyError.value = "";
};

const savePolicy = async () => {
  if (!policyPeer.value) return;
  savingPolicy.value = true;
  policyError.value = "";
  const deployments = policyForm.value.deployments
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const grants: ClusterGrant[] = selectedCapabilities.value.map((capability) => {
    if (capability === "deployments.read" || capability === "deployments.run") {
      return { capability, deployments };
    }
    if (capability === "capacity.offer") {
      return {
        capability,
        max_cpu: policyForm.value.maxCPU,
        max_memory: Math.round(policyForm.value.maxMemoryGB * 1024 ** 3),
        max_replicas: policyForm.value.maxReplicas,
      };
    }
    return { capability };
  });
  try {
    if (reviewMode === "fleet") {
      notifications.success("Review updated", `${policyPeer.value.name} now uses the preview policy.`);
      showPolicyModal.value = false;
      policyPeer.value = null;
      return;
    }
    await clusterApi.updatePeerPolicy(policyPeer.value.name, grants);
    notifications.success("Access updated", `${policyPeer.value.name} now uses the new Fleet policy.`);
    showPolicyModal.value = false;
    policyPeer.value = null;
  } catch (error: any) {
    policyError.value = error.response?.data?.error || error.message;
  } finally {
    savingPolicy.value = false;
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
  gap: var(--space-4);
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
  border-radius: var(--radius-xl);
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
  max-width: 520px;
}

.disabled-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  color: var(--color-primary-700);
  background: var(--color-primary-50);
  border-radius: var(--radius-xl);
}

.status-chip {
  padding: 0.25rem 0.625rem;
  color: var(--color-warning-700);
  background: var(--color-warning-50);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.setup-form label {
  margin-top: var(--space-2);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.field-help {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.setup-note,
.setup-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
}

.policy-loading {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

.policy-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.capability-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.capability-row:has(input:checked) {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.capability-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--color-primary-700);
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
}

.capability-row > span:last-child {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.capability-row strong,
.policy-fields label {
  color: var(--text);
  font-size: var(--text-sm);
}

.capability-row small {
  color: var(--text-muted);
}

.policy-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-inset);
  border-radius: var(--radius-lg);
}

.lending-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.lending-fields > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.setup-note {
  color: var(--color-success-700);
  background: var(--color-success-50);
}

.setup-note div {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.setup-note span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.setup-error {
  margin-top: var(--space-2);
  color: var(--color-danger-700);
  background: var(--color-danger-50);
  font-size: var(--text-sm);
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

.header-left > svg {
  color: var(--accent);
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

.fleet-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
}

.fleet-heading p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.fleet-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.fleet-meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.fleet-meta span + span::before {
  width: 3px;
  height: 3px;
  margin-right: var(--space-1);
  background: var(--border-strong, var(--border));
  border-radius: var(--radius-full);
  content: "";
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
  padding: 6px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 6px 10px;
  font-size: 0.8125rem;
  color: var(--text);
  border-bottom: 1px solid var(--border-subtle);
}

.peer-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.peer-status.active,
.peer-status.peered {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.peer-status.unreachable,
.peer-status.offline {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.peer-status.pending {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
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
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-100);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.provider-form fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.provider-form legend {
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 600;
}

.provider-form fieldset > p {
  min-height: 2.5rem;
  margin: 0.25rem 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.provider-option {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.625rem;
  min-height: 4.5rem;
  margin-bottom: 0.625rem;
  padding: 0.75rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.provider-option.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.provider-option.unavailable {
  cursor: not-allowed;
  opacity: 0.65;
}

.provider-option-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  color: var(--accent);
  background: var(--accent-subtle);
  border-radius: var(--radius-sm);
}

.provider-option-copy {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.provider-option-copy strong {
  color: var(--text);
  font-size: 0.8125rem;
}

.provider-option-copy small {
  color: var(--text-muted);
  line-height: 1.35;
}

.provider-option-copy .provider-reason {
  color: var(--color-warning-700);
}

.provider-connection {
  grid-column: 1 / -1;
  padding: 0.875rem !important;
  background: var(--surface-inset);
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-sm);
}

.provider-connection > p {
  min-height: 0 !important;
}

.provider-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.provider-fields label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
}

.provider-fields small {
  color: var(--text-muted);
  font-weight: 400;
  line-height: 1.35;
}

.active-chip {
  padding: 0.2rem 0.45rem;
  color: var(--color-success-700);
  background: var(--color-success-50);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 600;
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
  color: var(--color-danger-700);
  background: var(--color-danger-50);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-warning-700);
  background: var(--color-warning-50);
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
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .header-right :deep(button:last-child) {
    grid-column: 1 / -1;
  }

  .fleet-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .fleet-meta span + span::before {
    display: none;
  }

  .lending-fields {
    grid-template-columns: 1fr;
  }

  .provider-form {
    grid-template-columns: 1fr;
  }

  .provider-form fieldset > p {
    min-height: 0;
  }

  .provider-fields {
    grid-template-columns: 1fr;
  }
}
</style>
