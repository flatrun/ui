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
        <BaseButton variant="ghost" size="sm" icon="refresh-cw" :loading="loading" @click="load()">Refresh</BaseButton>
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
          <option v-for="s in runStatuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </BaseSelect>
      </template>
      <template #empty-action>
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="plus" @click="showNew = true">
          New run
        </BaseButton>
      </template>
      <template #cell-status="{ item }">
        <span class="badge run-status" :class="statusTone(item.status)">
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
      <template #cell-duration="{ item }">{{ runDuration(item) }}</template>
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
          <span class="badge run-status" :class="statusTone(selected.status)">
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
          <dd>{{ runDuration(selected) }}</dd>
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
          <div class="run-output">
            <LogViewer
              :key="selected.id"
              :logs="logs"
              :loading="logsLoading && !logs"
              :empty-message="outputEmptyMessage(selected)"
              :file-name="`run-${selected.id.slice(0, 8)}.log`"
              :assist-context="isActive(selected) ? null : assistContext"
              initial-mode="raw"
              @refresh="loadLogs"
            />
          </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Icon from "@/components/base/Icon.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import SlidePanel from "@/components/base/SlidePanel.vue";
import DataTable from "@/components/DataTable.vue";
import LogViewer from "@/components/LogViewer.vue";
import NewRunModal from "@/components/runs/NewRunModal.vue";
import { runsApi, type Run } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import type { AssistContext } from "@/stores/assist";
import {
  commandText,
  isActive,
  limitsText,
  outputEmptyMessage,
  runDuration,
  runStatuses,
  statusLabel,
  statusTone,
} from "@/model/runs";

const auth = useAuthStore();
const notifications = useNotificationsStore();
const canWrite = auth.hasPermission("runs:write");

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
let timer: ReturnType<typeof setInterval> | null = null;

const runs = computed(() =>
  statusFilter.value ? allRuns.value.filter((r) => r.status === statusFilter.value) : allRuns.value,
);

const assistContext = computed<AssistContext | null>(() =>
  selected.value
    ? { scope: "system", subject: `run ${selected.value.id.slice(0, 8)} of ${selected.value.spec.image}` }
    : null,
);

function formatTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString() : "";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function errorDetail(e: any): Promise<string> {
  const body = e?.response?.data;
  if (body instanceof Blob) {
    try {
      return JSON.parse(await body.text()).error || e.message;
    } catch {
      return e.message;
    }
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body).error || e.message;
    } catch {
      return e.message;
    }
  }
  return body?.error || e?.message;
}

async function load(quiet = false) {
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
    } else if (!quiet) {
      notifications.error("Could not load runs", await errorDetail(e));
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
  logsLoading.value = true;
  try {
    const res = await runsApi.logs(id);
    if (request !== logsRequest || selected.value?.id !== id) return;
    logs.value = res.data;
    logsError.value = "";
  } catch (e: any) {
    if (request !== logsRequest || selected.value?.id !== id) return;
    const detail = await errorDetail(e);
    if (request !== logsRequest || selected.value?.id !== id) return;
    logsError.value = detail || "the request failed";
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
    await load(true);
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
    notifications.error("Could not cancel run", await errorDetail(e));
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
    notifications.error("Download failed", await errorDetail(e));
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

.run-status {
  gap: 0.3rem;
  white-space: nowrap;
}

.badge-neutral {
  background: var(--surface-inset);
  color: var(--text-muted);
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

.run-output {
  height: 420px;
  border-radius: var(--radius-sm);
  overflow: hidden;
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
