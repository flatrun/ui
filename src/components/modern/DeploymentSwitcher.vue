<template>
  <div class="switcher">
    <Popover v-model:open="open" width="340px">
      <template #trigger="{ toggle }">
        <button type="button" class="crumb" :aria-expanded="open" aria-haspopup="dialog" @click="toggle">
          <span v-if="current" class="dot" :class="statusOf(current)" />
          <span class="crumb-label">{{ current?.name ?? "Deployments" }}</span>
          <Icon name="chevrons-up-down" :size="14" />
        </button>
      </template>
      <template #default="{ close }">
        <div class="search">
          <Icon name="search" :size="14" />
          <input
            ref="searchInput"
            v-model="query"
            placeholder="Find a deployment..."
            aria-label="Find a deployment"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="openActive(close)"
          />
        </div>
        <ul class="rows" role="listbox">
          <li v-if="!filtered.length" class="empty">{{ loading ? "Loading..." : "No deployments match." }}</li>
          <li
            v-for="(d, i) in filtered"
            :key="d.name"
            role="option"
            :aria-selected="i === active"
            class="row"
            :class="{ active: i === active, current: d.name === currentName }"
            @mouseenter="active = i"
          >
            <button type="button" class="row-main" @click="go(d.name, undefined, close)">
              <span class="dot" :class="statusOf(d)" />
              <span class="row-name">{{ d.name }}</span>
              <span v-if="d.metadata?.environment" class="env-tag">{{ d.metadata.environment.name }}</span>
            </button>
            <span class="row-actions">
              <button type="button" title="Logs" aria-label="Logs" @click="go(d.name, 'logs', close)">
                <Icon name="scroll-text" :size="14" />
              </button>
              <button type="button" title="Variables" aria-label="Variables" @click="go(d.name, 'variables', close)">
                <Icon name="braces" :size="14" />
              </button>
              <button
                v-if="d.metadata?.source && canWrite"
                type="button"
                title="Deploy latest"
                aria-label="Deploy latest"
                :disabled="job.state.isRunning"
                @click="runJob('redeploy', d.name, close)"
              >
                <Icon name="rocket" :size="14" />
              </button>
              <button
                v-if="canWrite"
                type="button"
                title="Restart"
                aria-label="Restart"
                :disabled="job.state.isRunning"
                @click="runJob('restart', d.name, close)"
              >
                <Icon name="rotate-cw" :size="14" />
              </button>
            </span>
          </li>
        </ul>
        <div class="footer">
          <RouterLink to="/deployments" @click="close">All deployments</RouterLink>
          <span>{{ deployments.length }} total</span>
        </div>
      </template>
    </Popover>

    <span v-if="environments.length > 1" class="env-part">
      <span class="sep">/</span>
      <Popover v-model:open="envOpen" width="220px">
        <template #trigger="{ toggle }">
          <button type="button" class="crumb" aria-haspopup="dialog" @click="toggle">
            <Icon name="git-branch" :size="14" />
            <span class="crumb-label">{{ environmentLabel(current!) }}</span>
            <Icon name="chevrons-up-down" :size="14" />
          </button>
        </template>
        <template #default="{ close }">
          <ul class="rows">
            <li v-for="d in environments" :key="d.name" class="row" :class="{ current: d.name === currentName }">
              <button type="button" class="row-main" @click="go(d.name, undefined, close)">
                <span class="dot" :class="statusOf(d)" />
                <span class="row-name">{{ environmentLabel(d) }}</span>
                <span class="env-tag">{{ d.name }}</span>
              </button>
            </li>
          </ul>
        </template>
      </Popover>
    </span>

    <OperationModal
      :visible="job.state.visible"
      :operation="job.state.operation"
      :deployment-name="job.state.deploymentName"
      :output="job.state.output"
      :is-running="job.state.isRunning"
      :is-success="job.state.isSuccess"
      @close="job.close()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { Deployment } from "@/types";
import { deploymentsApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useDeploymentJob, type DeploymentOperation } from "@/composables/useDeploymentJob";
import Popover from "@/components/base/Popover.vue";
import Icon from "@/components/base/Icon.vue";
import OperationModal from "@/components/OperationModal.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const canWrite = computed(() => auth.hasPermission("deployments:write"));

const open = ref(false);
const envOpen = ref(false);
const query = ref("");
const active = ref(0);
const loading = ref(false);
const deployments = ref<Deployment[]>([]);
const searchInput = ref<HTMLInputElement | null>(null);

const job = useDeploymentJob(() => load());

const currentName = computed(() => (route.name === "deployment-detail" ? String(route.params.name) : ""));
const current = computed(() => deployments.value.find((d) => d.name === currentName.value));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  const list = [...deployments.value].sort((a, b) => a.name.localeCompare(b.name));
  return q ? list.filter((d) => d.name.toLowerCase().includes(q)) : list;
});

const environments = computed(() => {
  if (!current.value) return [];
  const base = current.value.metadata?.environment?.base ?? current.value.name;
  return deployments.value
    .filter((d) => d.name === base || d.metadata?.environment?.base === base)
    .sort((a, b) => (a.name === base ? -1 : b.name === base ? 1 : a.name.localeCompare(b.name)));
});

function environmentLabel(d: Deployment) {
  return d.metadata?.environment?.name ?? "production";
}

function statusOf(d: Deployment) {
  if (d.metadata?.sleep?.sleeping) return "sleeping";
  return d.status;
}

async function load() {
  loading.value = true;
  try {
    deployments.value = (await deploymentsApi.list()).data.deployments || [];
  } catch {
    deployments.value = [];
  } finally {
    loading.value = false;
  }
}

function move(delta: number) {
  const n = filtered.value.length;
  if (n) active.value = (active.value + delta + n) % n;
}

function go(name: string, section: string | undefined, close: () => void) {
  close();
  router.push({ path: `/deployments/${encodeURIComponent(name)}`, query: section ? { section } : {} });
}

function openActive(close: () => void) {
  const d = filtered.value[active.value];
  if (d) go(d.name, undefined, close);
}

function runJob(operation: DeploymentOperation, name: string, close: () => void) {
  close();
  job.run(operation, name);
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  query.value = "";
  active.value = 0;
  load();
  await nextTick();
  searchInput.value?.focus();
});

watch(query, () => (active.value = 0));

watch(currentName, (name) => {
  if (name && !loading.value && !deployments.value.some((d) => d.name === name)) load();
});

onMounted(load);
</script>

<style scoped>
.env-part {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
}

@media (max-width: 600px) {
  .env-part {
    display: none;
  }

  .crumb {
    max-width: 150px;
  }
}

.switcher {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
}

.crumb {
  display: inline-flex;
  max-width: 260px;
  height: var(--control-h-sm);
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.crumb:hover,
.crumb[aria-expanded="true"] {
  background: var(--surface-inset);
}

.crumb .app-icon {
  color: var(--text-muted);
}

.crumb-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sep {
  color: var(--text-subtle);
}

.dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  background: var(--status-stopped);
  border-radius: 50%;
}

.dot.running {
  background: var(--status-running);
}

.dot.error {
  background: var(--status-failed);
}

.dot.sleeping {
  background: var(--status-sleeping);
}

.search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.search input {
  width: 100%;
  height: var(--control-h);
  background: transparent;
  border: 0;
  color: var(--text);
  font: inherit;
  font-size: var(--text-base);
  outline: none;
}

.rows {
  max-height: 340px;
  overflow-y: auto;
  margin: var(--space-1) 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
}

.row.active,
.row:hover {
  background: var(--surface-inset);
}

.row-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2);
  background: transparent;
  border: 0;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  text-align: left;
}

.row.current .row-name {
  font-weight: var(--font-semibold);
}

.row-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.env-tag {
  margin-left: auto;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.row-actions {
  display: none;
  gap: 2px;
  padding-right: var(--space-1);
}

.row.active .row-actions,
.row:hover .row-actions {
  display: flex;
}

.row-actions button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  cursor: pointer;
}

.row-actions button:hover:not(:disabled) {
  background: var(--surface);
  color: var(--text);
}

.empty {
  padding: var(--space-3) var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) var(--space-2) var(--space-1);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.footer a {
  color: var(--accent);
  text-decoration: none;
}
</style>
