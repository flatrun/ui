<template>
  <form class="service-settings" @submit.prevent="save">
    <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>

    <section>
      <h4>Resources</h4>
      <div class="row">
        <div class="field">
          <label for="svc-cpus">CPU limit (cores)</label>
          <input
            id="svc-cpus"
            v-model.trim="form.cpus"
            class="form-input"
            inputmode="decimal"
            placeholder="No limit"
            :disabled="!canWrite"
          />
        </div>
        <div class="field">
          <label for="svc-memory">Memory limit</label>
          <div class="size-input">
            <input
              id="svc-memory"
              v-model.trim="form.memoryAmount"
              class="form-input"
              inputmode="numeric"
              placeholder="No limit"
              :disabled="!canWrite"
            />
            <select v-model="form.memoryUnit" class="form-input" aria-label="Memory unit" :disabled="!canWrite">
              <option value="m">MB</option>
              <option value="g">GB</option>
            </select>
          </div>
        </div>
      </div>
      <p class="hint">Hard limits. A service that goes over its memory limit is stopped by the kernel.</p>
    </section>

    <section>
      <h4>Restart and logs</h4>
      <div class="row">
        <div class="field">
          <label for="svc-restart">Restart policy</label>
          <select id="svc-restart" v-model="form.restart" class="form-input" :disabled="!canWrite">
            <option value="">From the compose file</option>
            <option value="unless-stopped">Unless stopped</option>
            <option value="always">Always</option>
            <option value="on-failure">On failure</option>
            <option value="no">Never</option>
          </select>
        </div>
        <div class="field">
          <label for="svc-log-size">Log file size (MB)</label>
          <input
            id="svc-log-size"
            v-model.trim="form.logSize"
            class="form-input"
            inputmode="numeric"
            placeholder="No rotation"
            :disabled="!canWrite"
          />
        </div>
        <div class="field">
          <label for="svc-log-files">Log files kept</label>
          <input
            id="svc-log-files"
            v-model.number="form.logFiles"
            type="number"
            min="1"
            max="100"
            class="form-input"
            placeholder="1"
            :disabled="!canWrite || !form.logSize"
          />
        </div>
      </div>
      <p class="hint">Rotating logs stops a chatty service from filling the disk.</p>
    </section>

    <section>
      <h4>Environment</h4>
      <div v-for="(variable, index) in form.environment" :key="index" class="env-row">
        <input
          v-model.trim="variable.name"
          class="form-input mono"
          :aria-label="`Variable ${index + 1} name`"
          placeholder="NAME"
          :disabled="!canWrite"
        />
        <input
          v-model="variable.value"
          class="form-input mono"
          :aria-label="`Variable ${index + 1} value`"
          placeholder="value"
          :disabled="!canWrite"
        />
        <button
          v-if="canWrite"
          type="button"
          class="icon-btn"
          aria-label="Remove variable"
          @click="form.environment.splice(index, 1)"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>
      <BaseButton v-if="canWrite" size="sm" icon="plus" @click="form.environment.push({ name: '', value: '' })">
        Add variable
      </BaseButton>
      <p class="hint">Added to the compose file's own variables; a name set in both uses this value.</p>
    </section>

    <section>
      <h4>Command</h4>
      <div class="row">
        <div class="field">
          <label for="svc-command">Command</label>
          <textarea
            id="svc-command"
            v-model="form.command"
            class="form-input mono"
            rows="3"
            placeholder="From the image"
            :disabled="!canWrite"
          />
        </div>
        <div class="field">
          <label for="svc-entrypoint">Entrypoint</label>
          <textarea
            id="svc-entrypoint"
            v-model="form.entrypoint"
            class="form-input mono"
            rows="3"
            placeholder="From the image"
            :disabled="!canWrite"
          />
        </div>
      </div>
      <p class="hint">One argument per line. Leave empty to keep what the image or compose file sets.</p>
    </section>

    <p v-if="error" class="field-error" role="alert">{{ error }}</p>

    <div v-if="canWrite" class="actions">
      <BaseButton type="submit" variant="primary" :loading="saving" :disabled="!!error">Save settings</BaseButton>
      <span v-if="pendingApply && !job?.isRunning" class="pending">
        Saved. The running container keeps its old settings until it is recreated.
        <BaseButton size="sm" icon="refresh-cw" @click="applyNow">Recreate now</BaseButton>
      </span>
      <span v-if="job?.isRunning" class="pending">
        <Icon name="loader-circle" spin :size="14" />
        Recreating {{ service }}…
      </span>
      <span v-else-if="job?.isSuccess === false" class="field-error">Recreating {{ service }} failed.</span>
      <span v-else-if="job?.isSuccess" class="pending">{{ service }} is running with the new settings.</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { ServiceSettings } from "@/types";
import { deploymentsApi } from "@/services/api";
import { usePlanFlow } from "@/composables/usePlanFlow";
import { useServiceJobs } from "@/composables/useServiceJobs";
import { useNotificationsStore } from "@/stores/notifications";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{ deploymentName: string; service: string; canWrite: boolean }>();

const form = reactive({
  cpus: "",
  memoryAmount: "",
  memoryUnit: "m" as "m" | "g",
  restart: "",
  logSize: "",
  logFiles: "" as number | "",
  environment: [] as { name: string; value: string }[],
  command: "",
  entrypoint: "",
});

const loadError = ref("");
const saving = ref(false);
const pendingApply = ref(false);
const { runGuarded } = usePlanFlow();
const notifications = useNotificationsStore();
const jobs = useServiceJobs(() => props.deploymentName);
const job = computed(() => jobs.states[props.service]);

function fill(settings: ServiceSettings) {
  form.cpus = settings.resources?.cpus || "";
  const memory = /^(\d+)([mg])$/i.exec(settings.resources?.memory || "");
  form.memoryAmount = memory ? memory[1] : "";
  form.memoryUnit = memory ? (memory[2].toLowerCase() as "m" | "g") : "m";
  form.restart = settings.restart || "";
  form.logSize = (settings.logging?.max_size || "").replace(/m$/i, "");
  form.logFiles = settings.logging?.max_files || "";
  form.environment = Object.entries(settings.environment || {}).map(([name, value]) => ({ name, value }));
  form.command = (settings.command || []).join("\n");
  form.entrypoint = (settings.entrypoint || []).join("\n");
}

async function load() {
  loadError.value = "";
  pendingApply.value = false;
  try {
    const { data } = await deploymentsApi.getServiceSettings(props.deploymentName, props.service);
    fill(data.settings || {});
  } catch {
    fill({});
    loadError.value = "Could not load this service's settings.";
  }
}

watch(() => [props.deploymentName, props.service], load, { immediate: true });

const error = computed(() => {
  if (form.cpus && !(Number(form.cpus) > 0)) return "CPU limit must be a number above 0, such as 0.5 or 2.";
  if (form.memoryAmount) {
    if (!/^\d+$/.test(form.memoryAmount)) return "Memory limit must be a whole number.";
    if (form.memoryUnit === "m" && Number(form.memoryAmount) < 6) return "Memory limit must be at least 6 MB.";
  }
  if (form.logSize && !/^\d+$/.test(form.logSize)) return "Log file size must be a whole number of MB.";
  for (const v of form.environment) {
    if (!v.name && !v.value) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.name)) {
      return "Variable names may contain only letters, digits and _, and cannot start with a digit.";
    }
  }
  return "";
});

function lines(text: string): string[] | undefined {
  const list = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

function payload(): ServiceSettings {
  const environment = form.environment.filter((v) => v.name);
  return {
    resources:
      form.cpus || form.memoryAmount
        ? {
            cpus: form.cpus || undefined,
            memory: form.memoryAmount ? `${form.memoryAmount}${form.memoryUnit}` : undefined,
          }
        : undefined,
    restart: form.restart || undefined,
    logging: form.logSize
      ? { max_size: `${form.logSize}m`, max_files: form.logFiles ? Number(form.logFiles) : undefined }
      : undefined,
    environment: environment.length ? Object.fromEntries(environment.map((v) => [v.name, v.value])) : undefined,
    command: lines(form.command),
    entrypoint: lines(form.entrypoint),
  };
}

async function save() {
  if (error.value) return;
  const settings = payload();
  saving.value = true;
  try {
    const result = await runGuarded(
      () => deploymentsApi.updateServiceSettings(props.deploymentName, props.service, settings),
      () => deploymentsApi.updateServiceSettings(props.deploymentName, props.service, settings, { plan: true }),
      "Settings not saved",
    );
    if (result === false) return;
    pendingApply.value = true;
    notifications.success("Settings saved", `${props.service} uses them from its next recreate`);
  } finally {
    saving.value = false;
  }
}

async function applyNow() {
  pendingApply.value = false;
  await jobs.run(props.service, "start", { force_recreate: true });
}
</script>

<style scoped>
.service-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.field label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.form-input {
  width: 100%;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--text-sm);
}

.form-input:disabled {
  opacity: 0.7;
}

textarea.form-input {
  resize: vertical;
}

.mono {
  font-family: var(--font-mono);
}

.size-input {
  display: flex;
  gap: var(--space-2);
}

.size-input select {
  flex: 0 0 5rem;
}

.env-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
  gap: var(--space-2);
  align-items: center;
}

.icon-btn {
  display: inline-flex;
  padding: var(--space-1);
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--text);
}

.hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.field-error,
.load-error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-danger-600);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.pending {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
