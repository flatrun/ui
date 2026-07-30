<template>
  <div class="updates-view">
    <div class="view-header">
      <div class="header-content">
        <h1>Updates</h1>
        <p class="subtitle">Update the FlatRun agent and review available releases</p>
      </div>
      <div class="header-actions">
        <div class="channel-toggle" role="group" aria-label="Release channel">
          <button
            v-for="opt in channelOptions"
            :key="opt.value"
            class="channel-option"
            :class="{ active: channel === opt.value }"
            :disabled="loading"
            @click="setChannel(opt.value)"
          >
            <Icon :name="opt.icon" :size="14" />
            {{ opt.label }}
          </button>
        </div>
        <button class="btn btn-icon" :disabled="loading" @click="fetchAvailability">
          <Icon name="refresh-cw" :size="16" :spin="loading" />
        </button>
      </div>
    </div>

    <div v-if="loading && !availability" class="loading-state">
      <Icon name="refresh-cw" :size="32" spin />
      <span>Checking for updates...</span>
    </div>

    <div v-else-if="loadError" class="loading-state">
      <Icon name="circle-alert" :size="32" />
      <span>{{ loadError }}</span>
      <button class="btn btn-secondary" @click="fetchAvailability">Retry</button>
    </div>

    <template v-else-if="availability">
      <div class="status-card" :class="availability.update_available ? 'has-update' : 'current'">
        <div class="status-icon">
          <Icon :name="availability.update_available ? 'circle-arrow-up' : 'circle-check'" :size="28" />
        </div>
        <div class="status-body">
          <div class="status-line">
            <span class="status-label">Current version</span>
            <code>{{ availability.current_version || "unknown" }}</code>
          </div>
          <div class="status-line">
            <span class="status-label">Latest on {{ channel }}</span>
            <code>{{ availability.latest_version || "—" }}</code>
          </div>
          <p class="status-message">
            {{
              availability.update_available
                ? `Version ${availability.latest_version} is available to install.`
                : "You are running the latest release on this channel."
            }}
          </p>
        </div>
        <div v-if="availability.update_available && canWrite" class="status-action">
          <label class="restart-check">
            <input v-model="restartAfter" type="checkbox" :disabled="installing" />
            Restart service after update
          </label>
          <template v-if="!confirming">
            <button class="btn btn-primary" :disabled="installing" @click="confirming = true">
              <Icon name="download" :size="15" />
              Install {{ availability.latest_version }}
            </button>
          </template>
          <template v-else>
            <div class="confirm-row">
              <button class="btn btn-primary" :disabled="installing" @click="runUpdate">
                <Icon v-if="installing" name="refresh-cw" :size="15" spin />
                <Icon v-else name="check" :size="15" />
                {{ installing ? "Installing..." : "Confirm" }}
              </button>
              <button class="btn btn-secondary" :disabled="installing" @click="confirming = false">Cancel</button>
            </div>
          </template>
        </div>
        <div v-else-if="availability.update_available && !canWrite" class="status-action">
          <p class="no-perm">Updating requires the settings:write permission.</p>
        </div>
      </div>

      <div class="section-card">
        <div class="card-header">
          <Icon name="package" :size="16" />
          <h3>Available releases</h3>
        </div>
        <div v-if="!availability.releases.length" class="empty-releases">No releases found on this channel.</div>
        <ul v-else class="release-list">
          <li v-for="rel in availability.releases" :key="rel.version" class="release-item">
            <div class="release-head">
              <code class="release-version">{{ rel.version }}</code>
              <span v-if="rel.prerelease" class="tag tag-beta">
                <Icon name="flask-conical" :size="12" />
                prerelease
              </span>
              <span v-if="rel.version === availability.current_version" class="tag tag-current">installed</span>
              <span class="release-date">{{ formatDate(rel.published_at) }}</span>
            </div>
            <pre v-if="rel.changelog" class="release-changelog">{{ rel.changelog }}</pre>
            <p v-else class="release-changelog muted">No changelog provided.</p>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import { agentUpdateApi, healthApi, type UpdateAvailability, type UpdateChannel } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const CHANNEL_KEY = "flatrun_update_channel";

const notifications = useNotificationsStore();
const authStore = useAuthStore();

const loading = ref(false);
const installing = ref(false);
const confirming = ref(false);
const restartAfter = ref(true);
const loadError = ref("");
const availability = ref<UpdateAvailability | null>(null);
const channel = ref<UpdateChannel>(readStoredChannel());

const canWrite = authStore.hasPermission("settings:write");

const channelOptions: { value: UpdateChannel; label: string; icon: string }[] = [
  { value: "stable", label: "Stable", icon: "shield-check" },
  { value: "prerelease", label: "Prerelease", icon: "flask-conical" },
];

function readStoredChannel(): UpdateChannel {
  return localStorage.getItem(CHANNEL_KEY) === "prerelease" ? "prerelease" : "stable";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

const setChannel = (value: UpdateChannel) => {
  if (channel.value === value) return;
  channel.value = value;
  localStorage.setItem(CHANNEL_KEY, value);
  confirming.value = false;
  fetchAvailability();
};

const fetchAvailability = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await agentUpdateApi.get(channel.value);
    availability.value = res.data;
  } catch (err: unknown) {
    loadError.value = errorMessage(err, "Failed to check for updates");
  } finally {
    loading.value = false;
  }
};

const runUpdate = async () => {
  if (!availability.value) return;
  installing.value = true;
  try {
    const res = await agentUpdateApi.trigger({ channel: channel.value, restart: restartAfter.value });
    const { result, restarted, restart_error, restart_manual } = res.data;

    if (!result.installed) {
      notifications.info("No update installed", result.message);
    } else if (restarted) {
      notifications.success("Update installed", `Now running ${result.latest_version}. The service is restarting.`);
      setTimeout(confirmAfterRestart, 4000);
    } else if (restart_error) {
      notifications.warning(
        "Update installed, restart failed",
        `${restart_error}. Restart manually: ${restart_manual}`,
      );
    } else {
      notifications.success("Update installed", `${result.message}. Restart the service to apply it.`);
    }
  } catch (err: unknown) {
    notifications.error("Update failed", errorMessage(err, "The update could not be installed"));
  } finally {
    installing.value = false;
    confirming.value = false;
  }
};

// After a self-restart the agent is briefly unreachable; retry the health check
// a few times, then refresh the availability so the current version reflects
// the restarted binary.
const confirmAfterRestart = async (attempt = 0) => {
  try {
    await healthApi.check();
    await fetchAvailability();
  } catch {
    if (attempt < 5) {
      setTimeout(() => confirmAfterRestart(attempt + 1), 3000);
    }
  }
};

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } } };
  return e?.response?.data?.error || fallback;
}

onMounted(fetchAvailability);
</script>

<style scoped>
.updates-view {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.channel-toggle {
  display: inline-flex;
  background: var(--surface-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.2rem;
  gap: 0.2rem;
}

.channel-option {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.channel-option.active {
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.channel-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.55rem 0.9rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
}

.btn-icon:hover:not(:disabled) {
  background: var(--surface-inset);
  color: var(--text);
}

.btn-primary {
  background: var(--color-primary-600, #2563eb);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-700, #1d4ed8);
}

.btn-secondary {
  background: var(--surface-inset);
  color: var(--text);
  border-color: var(--border);
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
  color: var(--text-muted);
}

.status-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.25rem;
  align-items: center;
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  padding: 1.5rem;
}

.status-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}

.status-card.current .status-icon {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-card.has-update .status-icon {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.status-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  min-width: 8rem;
}

.status-message {
  font-size: 0.875rem;
  color: var(--text);
  margin: 0.5rem 0 0 0;
}

.status-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
}

.restart-check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.confirm-row {
  display: flex;
  gap: 0.5rem;
}

.no-perm {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
}

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
  color: var(--text);
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
}

.empty-releases {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.release-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.release-item {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.release-item:last-child {
  border-bottom: none;
}

.release-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.release-version {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.tag-beta {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-700, #b45309);
}

.tag-current {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.release-date {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.release-changelog {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.5;
}

.release-changelog.muted {
  font-style: italic;
}
</style>
