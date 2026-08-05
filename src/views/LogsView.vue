<template>
  <div class="logs-view">
    <div class="logs-view-header">
      <div>
        <h1>Logs</h1>
        <p class="subtitle">Read any deployment's logs, from container output or its own log files.</p>
      </div>
    </div>

    <div class="logs-panel">
      <LogViewer
        :logs="logs"
        :records="logRecords"
        :loading="logsLoading"
        :file-name="`${selectedDeployment || 'deployment'}-logs.txt`"
        empty-message="Pick a deployment to see its logs"
      >
        <template #filters>
          <select v-model="selectedDeployment" class="form-select" @change="onDeploymentChange">
            <option value="" disabled>Select a deployment</option>
            <option v-for="d in deployments" :key="d.name" :value="d.name">{{ d.name }}</option>
          </select>
          <button
            class="btn btn-sm"
            :class="following ? 'btn-primary' : 'btn-secondary'"
            :disabled="!selectedDeployment"
            @click="toggleFollow"
          >
            <Icon :name="following ? 'circle-stop' : 'play'" :size="14" />
            {{ following ? "Following" : "Follow" }}
          </button>
          <select v-model="logSource" class="form-select" :disabled="!selectedDeployment" @change="onSourceChange">
            <option v-for="src in logSources" :key="src.id" :value="src.id">
              {{ src.name }}{{ src.path ? ` (${src.path})` : "" }}
            </option>
          </select>
          <select v-model="logsTail" class="form-select" :disabled="!selectedDeployment" @change="onSourceChange">
            <option :value="100">Last 100 lines</option>
            <option :value="500">Last 500 lines</option>
            <option :value="1000">Last 1000 lines</option>
            <option :value="0">All logs</option>
          </select>
        </template>
      </LogViewer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import LogViewer from "@/components/LogViewer.vue";
import Icon from "@/components/base/Icon.vue";
import { deploymentsApi } from "@/services/api";
import { useLogStream } from "@/composables/useLogStream";
import type { Deployment } from "@/types";
import type { LogRecord, LogSource } from "@/types/logs";

const route = useRoute();
const router = useRouter();

const deployments = ref<Deployment[]>([]);
const selectedDeployment = ref("");
const logSources = ref<LogSource[]>([{ id: "stdout", name: "Container output", type: "stdout" }]);
const logSource = ref("stdout");
const logsTail = ref(100);
const logsLoading = ref(false);
const fetchedLogs = ref("");
const fetchedRecords = ref<LogRecord[]>([]);

const logStream = useLogStream();
const following = logStream.following;
const logs = computed(() => (following.value ? logStream.lines.value.join("\n") : fetchedLogs.value));
const logRecords = computed(() => (following.value ? logStream.records.value : fetchedRecords.value));

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

const fetchLogs = async () => {
  if (!selectedDeployment.value) return;
  logsLoading.value = true;
  try {
    const response = await deploymentsApi.logs(selectedDeployment.value, {
      tail: logsTail.value || 100,
      source: logSource.value,
    });
    fetchedLogs.value = response.data.logs || "";
    fetchedRecords.value = response.data.records || [];
  } catch (err) {
    console.error("Failed to fetch logs:", err);
  } finally {
    logsLoading.value = false;
  }
};

const onDeploymentChange = async () => {
  logStream.stop();
  // Keep the deployment in the URL so the view is shareable and survives reload.
  router.replace({ query: { ...route.query, deployment: selectedDeployment.value } });
  await fetchLogSources();
  await fetchLogs();
};

const onSourceChange = () => {
  if (following.value) {
    logStream.start(selectedDeployment.value, { tail: logsTail.value || 100, source: logSource.value });
  } else {
    fetchLogs();
  }
};

const toggleFollow = () => {
  if (!selectedDeployment.value) return;
  if (following.value) {
    logStream.stop();
    fetchLogs();
    return;
  }
  logStream.start(selectedDeployment.value, { tail: logsTail.value || 100, source: logSource.value });
};

onMounted(async () => {
  await fetchDeployments();
  const preset = (route.query.deployment as string) || "";
  if (preset && deployments.value.some((d) => d.name === preset)) {
    selectedDeployment.value = preset;
    await fetchLogSources();
    await fetchLogs();
  }
});
</script>

<style scoped>
.logs-view {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: calc(100vh - 80px);
}

.logs-view-header h1 {
  margin: 0;
  font-size: var(--text-xl);
}

.subtitle {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.logs-panel {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
