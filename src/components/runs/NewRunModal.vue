<template>
  <BaseModal :visible="visible" title="New run" size="lg" :close-disabled="submitting" @close="emit('close')">
    <form id="new-run-form" class="run-form" @submit.prevent="submit">
      <BaseField label="Image" hint="Missing images are pulled.">
        <BaseInput v-model="image" placeholder="e.g. node:22-alpine" />
      </BaseField>

      <BaseField label="Runtime" :hint="runtimeHint(runtime)">
        <BaseSelect v-model="runtime">
          <option v-if="!runtime" value="" disabled>Choose a runtime</option>
          <option v-for="option in runtimes" :key="option.type" :value="option.type" :disabled="!option.available">
            {{ runtimeOptionLabel(option) }}
          </option>
        </BaseSelect>
      </BaseField>

      <BaseField label="Command" hint="Runs with sh -c. Leave empty to use the image's default command.">
        <BaseTextarea v-model="command" :rows="4" placeholder="e.g. npm ci && npm test" />
      </BaseField>

      <div class="run-form-grid">
        <BaseField label="Timeout (minutes)" hint="1 to 60.">
          <BaseInput v-model="timeoutMinutes" type="number" />
        </BaseField>
        <BaseField label="Network">
          <BaseSelect v-model="network">
            <option value="none">No network</option>
            <option value="egress">Outbound internet</option>
          </BaseSelect>
        </BaseField>
        <BaseField label="CPUs" :hint="isVm ? 'Rounded up to whole vCPUs. Empty for one.' : 'Empty for no limit.'">
          <BaseInput v-model="cpus" type="number" />
        </BaseField>
        <BaseField label="Memory (MB)" :hint="isVm ? 'Empty for the node default.' : 'Empty for no limit.'">
          <BaseInput v-model="memoryMb" type="number" />
        </BaseField>
      </div>

      <BaseField label="Working directory">
        <BaseInput v-model="workdir" placeholder="e.g. /app" />
      </BaseField>

      <BaseField
        label="Files to keep"
        hint="Absolute paths inside the run, one per line. Each is saved as a tar archive."
      >
        <BaseTextarea v-model="artifactPaths" :rows="3" placeholder="e.g. /out/report.json" />
      </BaseField>

      <div class="run-form-section">
        <span class="run-form-label">Environment</span>
        <KeyValueRows v-model="env" label="variable" />
      </div>

      <div class="run-form-section">
        <span class="run-form-label">Secrets</span>
        <p class="run-form-hint">
          Passed to the run as environment variables. They are not stored, and their values are masked in the logs.
        </p>
        <KeyValueRows v-model="secretEnv" label="secret" secret />
      </div>

      <p v-if="error" class="run-form-error" role="alert">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton :disabled="submitting" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" icon="play" type="submit" form="new-run-form" :loading="submitting">
        Start run
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import KeyValueRows, { type KeyValueRow } from "./KeyValueRows.vue";
import { runsApi, type CreateRunRequest, type Run, type RunRuntime } from "@/services/api";
import { chosenRuntime, defaultRuntimes, runtimeHint, runtimeOptionLabel } from "@/model/runs";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: []; created: [run: Run] }>();

const runtimes = ref<RunRuntime[]>(defaultRuntimes);
const runtime = ref("docker");
const isVm = computed(() => runtime.value === "firecracker");
const image = ref("");
const command = ref("");
const timeoutMinutes = ref<string | number>(10);
const network = ref("none");
const cpus = ref<string | number>("");
const memoryMb = ref<string | number>("");
const workdir = ref("");
const artifactPaths = ref("");
const env = ref<KeyValueRow[]>([]);
const secretEnv = ref<KeyValueRow[]>([]);
const submitting = ref(false);
const error = ref("");

function reset() {
  image.value = "";
  command.value = "";
  timeoutMinutes.value = 10;
  network.value = "none";
  cpus.value = "";
  memoryMb.value = "";
  workdir.value = "";
  artifactPaths.value = "";
  env.value = [];
  secretEnv.value = [];
  error.value = "";
}

watch(
  () => props.visible,
  (open) => {
    error.value = "";
    if (!open) secretEnv.value = [];
    else loadRuntimes();
  },
  { immediate: true },
);

async function loadRuntimes() {
  try {
    const res = await runsApi.runtimes();
    if (!res.data.items.length) return;
    runtimes.value = res.data.items;
  } catch {
    return;
  }
  runtime.value = chosenRuntime(runtimes.value, runtime.value);
}

function toMap(rows: KeyValueRow[]): Record<string, string> | undefined {
  const named = rows.filter((r) => r.key.trim() !== "");
  if (!named.length) return undefined;
  return Object.fromEntries(named.map((r) => [r.key.trim(), r.value]));
}

function optionalNumber(value: string | number): number | undefined | null {
  if (value === "" || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildRequest(): CreateRunRequest | string {
  const reference = image.value.trim();
  if (!reference) return "Image is required.";
  if (!runtime.value) return "Choose a runtime.";
  const minutes = Number(timeoutMinutes.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) return "Timeout must be a whole number from 1 to 60.";
  const paths = artifactPaths.value
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  if (paths.some((p) => !p.startsWith("/"))) return "Files to keep must be absolute paths.";

  const cpuLimit = optionalNumber(cpus.value);
  if (cpuLimit === null) return "CPUs must be a positive number, or empty for no limit.";
  const memory = optionalNumber(memoryMb.value);
  if (memory === null) return "Memory must be a positive number of MB, or empty for no limit.";
  const script = command.value.trim();
  return {
    runtime: runtime.value,
    image: reference,
    command: script ? ["sh", "-c", script] : undefined,
    env: toMap(env.value),
    secret_env: toMap(secretEnv.value),
    workdir: workdir.value.trim() || undefined,
    cpus: cpuLimit,
    memory_bytes: memory ? Math.round(memory * 1024 * 1024) : undefined,
    egress: network.value === "egress",
    timeout_seconds: minutes * 60,
    artifact_paths: paths.length ? paths : undefined,
  };
}

async function submit() {
  const request = buildRequest();
  if (typeof request === "string") {
    error.value = request;
    return;
  }
  error.value = "";
  submitting.value = true;
  try {
    const res = await runsApi.create(request);
    reset();
    emit("created", res.data);
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "The run could not be started.";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.run-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.run-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.run-form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.run-form-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
}

.run-form-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.run-form-error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
}
</style>
