<template>
  <div class="runs-view">
    <header class="page-header">
      <div>
        <h1>Runs</h1>
        <p>
          Run a command in a fresh container until it finishes. Logs and the files you keep stay after it is removed.
        </p>
      </div>
      <div class="head-actions">
        <BaseButton variant="ghost" size="sm" icon="refresh-cw" :loading="loading" @click="load">Refresh</BaseButton>
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="plus" @click="showNew = true">New run</BaseButton>
      </div>
    </header>

    <div v-if="unavailable" class="notice" role="status">
      <Icon name="circle-alert" :size="16" />
      {{ unavailable }}
    </div>

    <DataTable
      v-else
      :items="runs"
      :columns="columns"
      :loading="loading"
      :search-fields="['spec.image', 'owner_username', 'status', 'id']"
      search-placeholder="Search runs..."
      empty-title="No runs yet"
      :empty-text="canWrite ? 'Start a run to execute a command in a fresh container.' : 'Runs you start appear here.'"
    >
      <template #filters>
        <BaseSelect v-model="statusFilter" class="status-filter" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option v-for="s in statusOrder" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </BaseSelect>
      </template>
      <template #empty-action>
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="plus" @click="showNew = true">
          New run
        </BaseButton>
      </template>
      <template #cell-status="{ item }">
        <span class="status-pill" :class="`status-${item.status}`">
          <Icon v-if="isActive(item)" name="loader-circle" spin :size="12" />
          {{ statusLabel(item.status) }}
        </span>
      </template>
      <template #cell-run="{ item }">
        <code class="run-image">{{ item.spec.image }}</code>
        <div class="run-command">{{ commandText(item) }}</div>
      </template>
      <template #cell-created_at="{ item }">
        <span :title="item.created_at">{{ formatTime(item.created_at) }}</span>
      </template>
      <template #cell-duration="{ item }">{{ durationText(item) }}</template>
      <template #cell-actions="{ item }">
        <div class="row-actions">
          <BaseButton size="sm" variant="ghost" icon="panel-right-open" @click="open(item)">Details</BaseButton>
          <BaseButton
            v-if="canWrite && isActive(item)"
            size="sm"
            variant="ghost"
            icon="square"
            :loading="cancelling === item.id"
            @click="cancel(item)"
          >
            Cancel
          </BaseButton>
        </div>
      </template>
    </DataTable>

    <SlidePanel :visible="!!selected" size="xl" @close="close">
      <template #header>
        <div v-if="selected" class="panel-heading">
          <code class="panel-image">{{ selected.spec.image }}</code>
          <span class="muted">Run {{ selected.id.slice(0, 8) }}</span>
        </div>
      </template>
      <div v-if="selected" class="run-detail">
        <div class="detail-head">
          <span class="status-pill" :class="`status-${selected.status}`">
            <Icon v-if="isActive(selected)" name="loader-circle" spin :size="12" />
            {{ statusLabel(selected.status) }}
          </span>
          <BaseButton
            v-if="canWrite && isActive(selected)"
            size="sm"
            variant="danger"
            icon="square"
            :loading="cancelling === selected.id"
            @click="cancel(selected)"
          >
            Cancel run
          </BaseButton>
        </div>

        <p
          v-if="selected.error"
          class="run-error"
          :class="{ 'run-note': selected.status === 'succeeded' }"
          :role="selected.status === 'succeeded' ? 'status' : 'alert'"
        >
          {{ selected.error }}
        </p>

        <dl class="run-meta">
          <dt>Command</dt>
          <dd>
            <code>{{ commandText(selected) || "Image default" }}</code>
          </dd>
          <dt>Exit code</dt>
          <dd>{{ selected.exit_code ?? "None" }}</dd>
          <dt>Started by</dt>
          <dd>{{ selected.owner_username || "System" }}</dd>
          <dt>Created</dt>
          <dd>{{ formatTime(selected.created_at) }}</dd>
          <dt>Duration</dt>
          <dd>{{ durationText(selected) }}</dd>
          <dt>Timeout</dt>
          <dd>{{ Math.round(selected.spec.timeout_seconds / 60) }} min</dd>
          <dt>Network</dt>
          <dd>{{ selected.spec.egress ? "Outbound internet" : "No network" }}</dd>
          <dt>Limits</dt>
          <dd>{{ limitsText(selected) }}</dd>
        </dl>

        <section class="detail-section">
          <div class="section-head">
            <h3>Output</h3>
            <span v-if="isActive(selected)" class="muted">Updating live</span>
          </div>
          <div v-if="logsError" class="run-error" role="alert">
            <span>Could not load the output: {{ logsError }}</span>
            <BaseButton size="sm" variant="ghost" icon="refresh-cw" :loading="logsLoading" @click="loadLogs">
              Retry
            </BaseButton>
          </div>
          <pre ref="logBox" class="run-logs">{{
            logs || (logsLoading ? "Loading..." : logsError ? "" : "No output.")
          }}</pre>
        </section>

        <section class="detail-section">
          <div class="section-head">
            <h3>Kept files</h3>
          </div>
          <p v-if="!selected.spec.artifact_paths?.length" class="muted">This run keeps no files.</p>
          <p v-else-if="!selected.artifacts.length" class="muted">
            {{ isActive(selected) ? "Collected when the run ends." : "None of the requested paths existed." }}
          </p>
          <ul v-else class="artifact-list">
            <li v-for="a in selected.artifacts" :key="a.name">
              <Icon name="file-archive" :size="16" />
              <span class="artifact-name">{{ a.name }}</span>
              <span class="muted">{{ formatSize(a.size) }}</span>
              <BaseButton
                size="sm"
                variant="ghost"
                icon="download"
                :loading="downloading === a.name"
                @click="download(selected, a.name)"
              >
                Download
              </BaseButton>
            </li>
          </ul>
        </section>
      </div>
    </SlidePanel>

    <NewRunModal :visible="showNew" @close="showNew = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import Icon from "@/components/base/Icon.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import SlidePanel from "@/components/base/SlidePanel.vue";
import DataTable from "@/components/DataTable.vue";
import NewRunModal from "@/components/runs/NewRunModal.vue";
import { runsApi, type Run, type RunStatus } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";

const auth = useAuthStore();
const notifications = useNotificationsStore();
const canWrite = auth.hasPermission("runs:write");

const statusOrder: RunStatus[] = ["queued", "starting", "running", "succeeded", "failed", "timed_out", "cancelled"];
const statusLabels: Record<RunStatus, string> = {
  queued: "Queued",
  starting: "Starting",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  timed_out: "Timed out",
  cancelled: "Cancelled",
};

const columns = [
  { key: "status", label: "Status", width: "130px" },
  { key: "run", label: "Run" },
  { key: "owner_username", label: "Started by", width: "140px" },
  { key: "created_at", label: "Created", width: "200px" },
  { key: "duration", label: "Duration", width: "100px" },
  { key: "actions", label: "", width: "200px" },
];

const allRuns = ref<Run[]>([]);
const loading = ref(true);
const unavailable = ref("");
const statusFilter = ref("");
const showNew = ref(false);
const cancelling = ref<string | null>(null);
const downloading = ref<string | null>(null);
const selected = ref<Run | null>(null);
const logs = ref("");
const logsLoading = ref(false);
const logsError = ref("");
let listRequest = 0;
let runRequest = 0;
let logsRequest = 0;
let polling = false;
const logBox = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const runs = computed(() =>
  statusFilter.value ? allRuns.value.filter((r) => r.status === statusFilter.value) : allRuns.value,
);

function statusLabel(s: RunStatus) {
  return statusLabels[s] ?? s;
}

function isActive(r: Run) {
  return r.status === "queued" || r.status === "starting" || r.status === "running";
}

function commandText(r: Run) {
  const cmd = r.spec.command ?? [];
  if (cmd.length === 3 && cmd[0] === "sh" && cmd[1] === "-c") return cmd[2];
  return cmd.join(" ");
}

function formatTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString() : "";
}

function durationText(r: Run) {
  if (!r.started_at) return r.status === "queued" ? "Waiting" : "";
  const end = r.finished_at ? new Date(r.finished_at).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(r.started_at).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function limitsText(r: Run) {
  const parts = [];
  if (r.spec.cpus) parts.push(`${r.spec.cpus} CPU`);
  if (r.spec.memory_bytes) parts.push(`${Math.round(r.spec.memory_bytes / 1024 / 1024)} MB`);
  return parts.length ? parts.join(", ") : "None";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function load() {
  const request = ++listRequest;
  loading.value = true;
  try {
    const res = await runsApi.list();
    if (request !== listRequest) return;
    allRuns.value = res.data.items ?? [];
    unavailable.value = "";
    if (selected.value) {
      const fresh = allRuns.value.find((r) => r.id === selected.value!.id);
      if (fresh) selected.value = fresh;
    }
  } catch (e: any) {
    if (request !== listRequest) return;
    if (e.response?.status === 503) {
      unavailable.value = e.response.data?.error || "Runs are unavailable on this agent.";
    } else {
      notifications.error("Could not load runs", e.response?.data?.error || e.message);
    }
  } finally {
    if (request === listRequest) loading.value = false;
  }
}

async function refreshSelected() {
  if (!selected.value) return;
  const id = selected.value.id;
  const request = ++runRequest;
  try {
    const res = await runsApi.get(id);
    if (request !== runRequest || selected.value?.id !== id) return;
    selected.value = res.data;
    allRuns.value = allRuns.value.map((r) => (r.id === id ? res.data : r));
  } catch {
    return;
  }
}

async function loadLogs() {
  if (!selected.value) return;
  const id = selected.value.id;
  const request = ++logsRequest;
  const box = logBox.value;
  const atBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 24;
  logsLoading.value = true;
  try {
    const res = await runsApi.logs(id);
    if (request !== logsRequest || selected.value?.id !== id) return;
    logs.value = res.data;
    logsError.value = "";
    if (atBottom) {
      await nextTick();
      if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
    }
  } catch (e: any) {
    if (request !== logsRequest || selected.value?.id !== id) return;
    logsError.value = e.response?.data?.error || e.message || "the request failed";
  } finally {
    if (request === logsRequest) logsLoading.value = false;
  }
}

function open(r: Run) {
  selected.value = r;
  logs.value = "";
  logsError.value = "";
  loadLogs();
}

function close() {
  selected.value = null;
  logs.value = "";
  logsError.value = "";
}

async function tick() {
  const hadActive = allRuns.value.some(isActive);
  const watchingActive = !!selected.value && isActive(selected.value);
  if (polling || (!hadActive && !watchingActive)) return;
  polling = true;
  try {
    await load();
    if (watchingActive) {
      await refreshSelected();
      await loadLogs();
    }
  } finally {
    polling = false;
  }
}

async function cancel(r: Run) {
  cancelling.value = r.id;
  try {
    await runsApi.cancel(r.id);
    await load();
  } catch (e: any) {
    notifications.error("Could not cancel run", e.response?.data?.error || e.message);
  } finally {
    cancelling.value = null;
  }
}

async function download(r: Run, name: string) {
  downloading.value = name;
  try {
    const res = await runsApi.artifact(r.id, name);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    notifications.error("Download failed", e.response?.data?.error || e.message);
  } finally {
    downloading.value = null;
  }
}

function onCreated(r: Run) {
  showNew.value = false;
  allRuns.value = [r, ...allRuns.value.filter((x) => x.id !== r.id)];
  open(r);
}

onMounted(() => {
  load();
  timer = setInterval(tick, 2000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.runs-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text);
}

.page-header p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  max-width: 60ch;
}

.head-actions,
.row-actions {
  display: flex;
  gap: var(--space-2);
}

.notice {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  font-size: var(--text-sm);
}

.status-filter {
  width: 180px;
  flex: none;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  background: var(--surface-inset);
  color: var(--text-muted);
}

.status-queued,
.status-starting,
.status-running {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.status-succeeded {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-failed {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.status-timed_out {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.run-image {
  color: var(--text);
}

.run-command {
  max-width: 48ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.panel-heading {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.panel-image {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.run-detail {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.run-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.run-error.run-note {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.run-meta {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--space-2) var(--space-4);
  margin: 0;
}

.run-meta dt {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.run-meta dd {
  margin: 0;
  color: var(--text);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-head h3 {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.run-logs {
  margin: 0;
  min-height: 160px;
  max-height: 420px;
  overflow: auto;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  color: var(--text);
  font-size: var(--text-xs);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.artifact-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.artifact-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text);
}

.artifact-name {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.artifact-list li > :last-child {
  margin-left: auto;
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
