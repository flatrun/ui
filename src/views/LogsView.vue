<template>
  <div class="logs-view">
    <div class="logs-tabs">
      <button class="tab-btn" :class="{ active: scope === 'deployments' }" @click="switchScope('deployments')">
        <Icon name="package" :size="14" />
        Deployments
      </button>
      <button
        v-if="canReadSystemLogs"
        class="tab-btn"
        :class="{ active: scope === 'system' }"
        @click="switchScope('system')"
      >
        <Icon name="server-cog" :size="14" />
        System
      </button>
    </div>

    <div class="logs-panel">
      <LogViewer
        :logs="logs"
        :records="logRecords"
        :loading="logsLoading"
        :file-name="downloadName"
        :empty-message="emptyMessage"
        deletable
        @refresh="fetchLogs"
        @delete="askDelete"
      >
        <template #actions>
          <button
            class="btn btn-sm"
            :class="following ? 'btn-primary' : 'btn-secondary'"
            :disabled="!canFollow"
            @click="toggleFollow"
          >
            <Icon :name="following ? 'circle-stop' : 'play'" :size="14" />
            {{ following ? "Following" : "Follow" }}
          </button>
        </template>

        <template #filters>
          <template v-if="scope === 'deployments'">
            <select v-model="selectedDeployment" class="form-select" @change="onDeploymentChange">
              <option value="" disabled>Select a deployment</option>
              <option v-for="d in deployments" :key="d.name" :value="d.name">{{ d.name }}</option>
            </select>
            <select v-model="logSource" class="form-select" :disabled="!selectedDeployment" @change="onSourceChange">
              <option v-for="src in logSources" :key="src.id" :value="src.id">
                {{ src.name }}{{ src.path ? ` (${src.path})` : "" }}
              </option>
            </select>
            <select
              v-model="logsService"
              class="form-select"
              :disabled="!selectedDeployment || !serviceFilterAvailable"
              @change="onSourceChange"
            >
              <option value="all">All services</option>
              <option v-for="name in serviceNames" :key="name" :value="name">{{ name }}</option>
            </select>
          </template>

          <template v-else>
            <select v-model="systemSource" class="form-select" @change="onSourceChange">
              <option v-for="src in systemSources" :key="src.id" :value="src.id">{{ src.name }}</option>
            </select>
            <select
              v-model="systemDeployment"
              class="form-select"
              :disabled="!systemByDeployment"
              :title="
                systemByDeployment
                  ? 'Show only the requests to one deployment'
                  : 'Only the access log says which deployment a line belongs to'
              "
              @change="onSourceChange"
            >
              <option value="">All deployments</option>
              <option v-for="d in deployments" :key="d.name" :value="d.name">{{ d.name }}</option>
            </select>
          </template>

          <select v-model="logsTail" class="form-select" @change="onSourceChange">
            <option :value="100">Last 100 lines</option>
            <option :value="500">Last 500 lines</option>
            <option :value="1000">Last 1000 lines</option>
            <option :value="0">All logs</option>
          </select>
        </template>
      </LogViewer>
    </div>

    <ConfirmModal
      :visible="confirmingDelete"
      title="Delete these logs?"
      :message="deleteMessage"
      warning="The log is emptied on the server. What has already been written is gone, and this cannot be undone."
      confirm-text="Delete logs"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmingDelete = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import LogViewer from "@/components/LogViewer.vue";
import Icon from "@/components/base/Icon.vue";
import { deploymentsApi, systemLogsApi, systemLogsWsUrl, type SystemLogSource } from "@/services/api";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useLogStream } from "@/composables/useLogStream";
import { useAuthStore } from "@/stores/auth";
import type { Deployment } from "@/types";
import type { LogRecord, LogSource } from "@/types/logs";

const route = useRoute();
const router = useRouter();

type Scope = "deployments" | "system";
const scope = ref<Scope>("deployments");
// The proxy and the shared services belong to the host, so reading their logs is an
// infrastructure question rather than a deployment one.
const authStore = useAuthStore();
const canReadSystemLogs = computed(() => authStore.hasPermission("infrastructure:read"));

const deployments = ref<Deployment[]>([]);
const selectedDeployment = ref("");
const logSources = ref<LogSource[]>([{ id: "stdout", name: "Container output", type: "stdout" }]);
const logSource = ref("stdout");
const serviceNames = ref<string[]>([]);
const logsService = ref("all");
// A file source is one file the deployment writes, so there is nothing per-service to narrow.
const serviceFilterAvailable = computed(() => logSources.value.find((s) => s.id === logSource.value)?.type !== "file");
const activeLogService = computed(() => (serviceFilterAvailable.value ? logsService.value : "all"));

const systemSources = ref<SystemLogSource[]>([]);
const systemSource = ref("");
const systemDeployment = ref("");
// Only the proxy's access log says which deployment a line belongs to; an error log or a
// database's output has nothing to match a deployment against.
const systemByDeployment = computed(
  () => systemSources.value.find((s) => s.id === systemSource.value)?.by_deployment === true,
);
const activeSystemDeployment = computed(() => (systemByDeployment.value ? systemDeployment.value : ""));

const logsTail = ref(100);
const logsLoading = ref(false);
const fetchedLogs = ref("");
const fetchedRecords = ref<LogRecord[]>([]);

const logStream = useLogStream();
const following = logStream.following;
const logs = computed(() => (following.value ? logStream.lines.value.join("\n") : fetchedLogs.value));
const logRecords = computed(() => (following.value ? logStream.records.value : fetchedRecords.value));

const downloadName = computed(() =>
  scope.value === "system"
    ? `${systemSource.value || "system"}-logs.txt`
    : `${selectedDeployment.value || "deployment"}-logs.txt`,
);
const emptyMessage = computed(() =>
  scope.value === "system" ? "No logs from this system service" : "Pick a deployment to see its logs",
);
const notifications = useNotificationsStore();
const confirmingDelete = ref(false);
const deleting = ref(false);

const deleteMessage = computed(() => {
  if (scope.value === "system") {
    const source = systemSources.value.find((s) => s.id === systemSource.value);
    // Both nginx streams come from one container, so emptying one empties the other.
    return source?.by_deployment || source?.stream === "stderr"
      ? `This empties the ${source?.name} log, and the other stream from the same container with it.`
      : `This empties the ${source?.name ?? "system"} log.`;
  }
  const source = logSources.value.find((s) => s.id === logSource.value);
  if (source?.type === "file") {
    return `This empties ${source.path}, the file ${selectedDeployment.value} writes to.`;
  }
  return activeLogService.value === "all"
    ? `This empties the stored output of every container in ${selectedDeployment.value}.`
    : `This empties the stored output of ${selectedDeployment.value}/${activeLogService.value}.`;
});

const askDelete = () => {
  confirmingDelete.value = true;
};

const confirmDelete = async () => {
  deleting.value = true;
  try {
    if (scope.value === "system") {
      await systemLogsApi.deleteLogs(systemSource.value);
    } else {
      await deploymentsApi.deleteLogs(selectedDeployment.value, {
        source: logSource.value,
        service: activeLogService.value,
      });
    }
    confirmingDelete.value = false;
    logStream.stop();
    await fetchLogs();
    notifications.success("Logs deleted", "The log has been emptied.");
  } catch (err: any) {
    notifications.error("Delete failed", err?.response?.data?.error || err?.message || "The log could not be emptied.");
  } finally {
    deleting.value = false;
  }
};

const canFollow = computed(() => (scope.value === "system" ? !!systemSource.value : !!selectedDeployment.value));

const fetchDeployments = async () => {
  try {
    const response = await deploymentsApi.list();
    deployments.value = response.data.deployments || [];
  } catch (err) {
    console.error("Failed to fetch deployments:", err);
  }
};

const fetchLogSources = async () => {
  if (!selectedDeployment.value) return;
  logSources.value = [{ id: "stdout", name: "Container output", type: "stdout" }];
  logSource.value = "stdout";
  try {
    const response = await deploymentsApi.logSources(selectedDeployment.value);
    if (response.data.sources?.length) logSources.value = response.data.sources;
  } catch (err) {
    console.error("Failed to fetch log sources:", err);
  }
};

const fetchServiceNames = async () => {
  serviceNames.value = [];
  logsService.value = "all";
  if (!selectedDeployment.value) return;
  try {
    const response = await deploymentsApi.getServices(selectedDeployment.value);
    serviceNames.value = (response.data.services || []).map((s) => s.name);
  } catch (err) {
    console.error("Failed to fetch services:", err);
  }
};

const fetchSystemSources = async () => {
  try {
    const response = await systemLogsApi.sources();
    systemSources.value = response.data.sources || [];
    if (!systemSources.value.some((s) => s.id === systemSource.value)) {
      systemSource.value = systemSources.value[0]?.id || "";
    }
  } catch (err) {
    console.error("Failed to fetch system log sources:", err);
  }
};

const fetchLogs = async () => {
  if (scope.value === "deployments" && !selectedDeployment.value) return;
  if (scope.value === "system" && !systemSource.value) return;
  logsLoading.value = true;
  try {
    const response =
      scope.value === "system"
        ? await systemLogsApi.logs({
            source: systemSource.value,
            tail: logsTail.value ?? 100,
            deployment: activeSystemDeployment.value || undefined,
          })
        : await deploymentsApi.logs(selectedDeployment.value, {
            tail: logsTail.value ?? 100,
            source: logSource.value,
            service: activeLogService.value,
          });
    fetchedLogs.value = response.data.logs || "";
    fetchedRecords.value = response.data.records || [];
  } catch (err) {
    console.error("Failed to fetch logs:", err);
  } finally {
    logsLoading.value = false;
  }
};

const startFollowing = () => {
  if (scope.value === "system") {
    logStream.startUrl(
      systemLogsWsUrl({
        source: systemSource.value,
        tail: logsTail.value ?? 100,
        deployment: activeSystemDeployment.value || undefined,
      }),
    );
    return;
  }
  logStream.start(selectedDeployment.value, {
    tail: logsTail.value ?? 100,
    source: logSource.value,
    service: activeLogService.value,
  });
};

const onDeploymentChange = async () => {
  logStream.stop();
  router.replace({ query: { ...route.query, deployment: selectedDeployment.value } });
  await Promise.all([fetchLogSources(), fetchServiceNames()]);
  await fetchLogs();
};

const onSourceChange = () => {
  if (following.value) {
    startFollowing();
  } else {
    fetchLogs();
  }
};

const toggleFollow = () => {
  if (scope.value === "deployments" && !selectedDeployment.value) return;
  if (scope.value === "system" && !systemSource.value) return;
  if (following.value) {
    logStream.stop();
    fetchLogs();
    return;
  }
  startFollowing();
};

const switchScope = async (next: Scope) => {
  if (scope.value === next) return;
  logStream.stop();
  scope.value = next;
  fetchedLogs.value = "";
  fetchedRecords.value = [];
  router.replace({ query: { ...route.query, scope: next } });
  if (next === "system" && !systemSources.value.length) await fetchSystemSources();
  await fetchLogs();
};

onMounted(async () => {
  await fetchDeployments();
  if ((route.query.scope as string) === "system") {
    scope.value = "system";
    await fetchSystemSources();
    if (route.query.source && systemSources.value.some((s) => s.id === route.query.source)) {
      systemSource.value = route.query.source as string;
    }
    await fetchLogs();
    return;
  }
  const preset = (route.query.deployment as string) || "";
  if (preset && deployments.value.some((d) => d.name === preset)) {
    selectedDeployment.value = preset;
    await Promise.all([fetchLogSources(), fetchServiceNames()]);
    await fetchLogs();
  }
});
</script>

<style scoped>
.logs-view {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  gap: var(--space-4);
}

.logs-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--surface-inset);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  align-self: flex-start;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-base);
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

.logs-panel {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
