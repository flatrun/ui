<template>
  <SlidePanel :visible="!!service" :title="service?.name ?? ''" size="lg" @close="emit('close')">
    <div v-if="service" class="service-panel">
      <div class="tabs-row" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          class="panel-tab"
          :aria-selected="tab === t.id"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <LogViewer
        v-if="tab === 'logs'"
        :key="service.name"
        :logs="logs"
        :loading="loadingLogs"
        empty-message="No output from this service yet."
        :file-name="`${deploymentName}-${service.name}.log`"
        initial-mode="raw"
        @refresh="loadLogs"
      />

      <dl v-else class="facts">
        <div>
          <dt>Image</dt>
          <dd class="mono">{{ service.image || "Built from source" }}</dd>
        </div>
        <div>
          <dt>Replicas</dt>
          <dd>{{ service.running }} of {{ service.replicas }} running</dd>
        </div>
        <div v-if="service.domains.length">
          <dt>Domains</dt>
          <dd>
            <a v-for="d in service.domains" :key="d" :href="`https://${d}`" target="_blank" rel="noopener">{{ d }}</a>
          </dd>
        </div>
        <div v-if="service.ports.length">
          <dt>Ports</dt>
          <dd class="mono">{{ service.ports.join(", ") }}</dd>
        </div>
        <div v-if="service.dependsOn.length">
          <dt>Waits for</dt>
          <dd>{{ service.dependsOn.join(", ") }}</dd>
        </div>
        <div>
          <dt>Volumes</dt>
          <dd v-if="!service.mounts.length" class="muted">
            None. Data written inside the container is lost on redeploy.
          </dd>
          <dd v-else>
            <ul class="mounts">
              <li v-for="m in service.mounts" :key="m.target" class="mono">
                {{ m.source || "(anonymous)" }} → {{ m.target }}
                <span v-if="m.read_only" class="tag">read only</span>
                <span v-if="m.type === 'volume'" class="tag">named volume</span>
              </li>
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  </SlidePanel>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import SlidePanel from "@/components/base/SlidePanel.vue";
import LogViewer from "@/components/LogViewer.vue";
import { deploymentsApi } from "@/services/api";
import type { ProjectService } from "@/model/project";

const props = defineProps<{ deploymentName: string; service: ProjectService | null }>();
const emit = defineEmits<{ close: [] }>();

type Tab = "logs" | "settings";
const tabs: { id: Tab; label: string }[] = [
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" },
];

const tab = ref<Tab>("logs");
const logs = ref("");
const loadingLogs = ref(false);

async function loadLogs() {
  if (!props.service) return;
  loadingLogs.value = true;
  try {
    const { data } = await deploymentsApi.logs(props.deploymentName, { service: props.service.name, tail: 300 });
    logs.value = data.logs;
  } catch {
    logs.value = "";
  } finally {
    loadingLogs.value = false;
  }
}

watch(
  () => props.service?.name,
  (name) => {
    logs.value = "";
    if (name) loadLogs();
  },
  { immediate: true },
);
</script>

<style scoped>
.service-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}

.tabs-row {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border);
}

.panel-tab {
  margin-bottom: -1px;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
}

.panel-tab.active {
  border-bottom-color: var(--text);
  color: var(--text);
  font-weight: var(--font-medium);
}

.facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
}

.facts dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.facts dd {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 2px 0 0;
  font-size: var(--text-base);
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}

.mounts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  margin-left: var(--space-2);
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 11px;
}
</style>
